import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { ClaudeSessionWatcher } from './claude-watcher.js';
import { discoverFromRoots, loadScanPaths, saveScanPaths } from './path-scanner.js';
import { listSessions, getSession, getMessages, searchMessages, getAnalytics } from './db.js';
import { indexSession } from './indexer.js';
import { sendTelegram } from './telegram.js';
import { wikiIngest } from './wiki-ingest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;

// ── Helper: esegui script PS da file temp (evita limite 8191 char) ──
function runPsFile(script, timeoutMs, callback) {
  const tmpFile = path.join(os.tmpdir(), `ccd_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.ps1`);
  // UTF-8 BOM: PowerShell 5.1 legge correttamente caratteri non-ASCII
  fs.writeFileSync(tmpFile, '\ufeff' + script, 'utf-8');
  exec(
    `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tmpFile}"`,
    { timeout: timeoutMs },
    (error, stdout, stderr) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      callback(error, stdout, stderr);
    }
  );
}

// ── File di persistenza ──────────────────────────────────────
const EXCLUDED_PATHS_FILE = path.join(__dirname, 'excluded-paths.json');
const WIKI_SETTINGS_FILE  = path.join(__dirname, 'wiki-settings.json');

function loadWikiSettings() {
  try {
    if (fs.existsSync(WIKI_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(WIKI_SETTINGS_FILE, 'utf-8'));
    }
  } catch {}
  return { wikiPath: process.env.WIKI_PATH || 'C:\\EGM-Wiki' };
}

function saveWikiSettings(settings) {
  fs.writeFileSync(WIKI_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function loadExcludedPaths() {
  try {
    if (fs.existsSync(EXCLUDED_PATHS_FILE)) {
      return JSON.parse(fs.readFileSync(EXCLUDED_PATHS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function saveExcludedPaths(paths) {
  fs.writeFileSync(EXCLUDED_PATHS_FILE, JSON.stringify(paths, null, 2));
}

// ── Discovery iniziale ───────────────────────────────────────
const excludedPaths = loadExcludedPaths();
const scanPaths = loadScanPaths();

let config;

if (scanPaths.length > 0) {
  console.log(`🗂️  Modalità SCAN ROOTS (${scanPaths.length} percorsi configurati)\n`);
  const discovered = discoverFromRoots(scanPaths, excludedPaths);

  // Merge con config.json manuale se esiste
  try {
    const manualConfig = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8')
    );
    const discoveredPaths = new Set(discovered.map(p => p.path.toLowerCase()));
    const manualOnly = manualConfig.projects.filter(p =>
      !discoveredPaths.has(p.path.toLowerCase()) &&
      !excludedPaths.some(ep => ep.toLowerCase() === p.path.toLowerCase())
    );
    const seenNames = new Set();
    const merged = [...manualOnly, ...discovered].filter(p => {
      if (seenNames.has(p.name)) return false;
      seenNames.add(p.name);
      return true;
    });
    config = { projects: merged };
    console.log(`📋 +${manualOnly.length} progetti da config.json`);
  } catch {
    config = { projects: discovered };
  }
} else {
  // Fallback: leggi da config.json
  try {
    config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));
    console.log(`📋 Caricati ${config.projects.length} progetti da config.json\n`);
  } catch {
    console.warn('⚠️  Nessun percorso configurato. Aggiungi percorsi dall\'area Admin.');
    config = { projects: [] };
  }
}

console.log(`📊 Progetti monitorati: ${config.projects.length}\n`);

// ── Express + WebSocket ──────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set();

// ── Handler nuovo progetto rilevato dinamicamente ────────────
function handleNewProjectDir(claudeDirName) {
  const currentScanPaths = loadScanPaths();
  const currentExcluded = loadExcludedPaths();
  const discovered = discoverFromRoots(currentScanPaths, currentExcluded);

  for (const project of discovered) {
    const dirName = projectWatcher.projectPathToClaudeDirName(project.path);
    if (dirName === claudeDirName) {
      if (!config.projects.some(p => p.path.toLowerCase() === project.path.toLowerCase())) {
        config.projects.push(project);
        projectWatcher.addNewProject(project);
        broadcastConfigUpdate();
        console.log(`\n🆕 Nuovo progetto rilevato: ${project.name}`);
      }
      break;
    }
  }
}

// ── Catch-up indexing on startup ─────────────────────
(async () => {
  try {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    if (fs.existsSync(claudeDir)) {
      const projectDirs = fs.readdirSync(claudeDir);
      for (const dir of projectDirs) {
        const dirPath = path.join(claudeDir, dir);
        if (!fs.statSync(dirPath).isDirectory()) continue;
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jsonl'));
        for (const file of files) {
          await new Promise(r => setImmediate(r)); // yield between files
          indexSession(path.join(dirPath, file), dir);
        }
      }
    }
  } catch (err) {
    console.error('Catch-up indexing error:', err.message);
  }
})();

// ── Watcher ──────────────────────────────────────────────────
const projectWatcher = new ClaudeSessionWatcher(config.projects, broadcastStatus, broadcastConfigUpdate, handleNewProjectDir);
projectWatcher.start();

// ── WebSocket ────────────────────────────────────────────────
wss.on('connection', (ws) => {
  console.log('🔌 Nuovo client connesso');
  clients.add(ws);

  ws.send(JSON.stringify({
    type: 'config',
    projects: config.projects.map(p => ({ name: p.name, path: p.path }))
  }));

  ws.on('close', () => { clients.delete(ws); });
  ws.on('error', () => { clients.delete(ws); });
});

function broadcastConfigUpdate() {
  const msg = JSON.stringify({
    type: 'config',
    projects: config.projects.map(p => ({ name: p.name, path: p.path }))
  });
  clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

function broadcastStatus(data) {
  const msg = JSON.stringify({ type: 'status', data });
  clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

// ── API: Progetto ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', projects: config.projects.length });
});

app.get('/api/projects', (req, res) => {
  res.json(config.projects);
});

app.post('/api/projects/:projectName/mark-checked', (req, res) => {
  const { projectName } = req.params;
  const project = config.projects.find(p => p.name === projectName);
  if (!project) return res.status(404).json({ error: 'Progetto non trovato' });

  projectWatcher.markAsChecked(projectName);

  // Clear hook status so frontend moves card out of Da Controllare immediately
  if (project.path) {
    const wsMsg = JSON.stringify({
      type: 'hook_status',
      projectPath: project.path,
      projectName,
      status: 'idle',
      timestamp: Date.now()
    });
    clients.forEach(c => { if (c.readyState === 1) c.send(wsMsg); });
  }

  res.json({ success: true });
});

app.post('/api/projects/:projectName/reset-status', (req, res) => {
  const { projectName } = req.params;
  const project = config.projects.find(p => p.name === projectName);
  if (!project) return res.status(404).json({ error: 'Progetto non trovato' });
  if (!project.path) return res.status(400).json({ error: 'Percorso progetto non configurato' });

  // statusPath is fully server-controlled (no user input), so no traversal is possible
  const statusPath = path.join(path.resolve(project.path), '.claude', 'status.json');

  const idleStatus = {
    status: 'idle',
    lastUpdate: new Date().toISOString(),
    lastOutput: 'Sessione terminata (reset manuale)',
    project: projectName
  };
  try {
    fs.writeFileSync(statusPath, JSON.stringify(idleStatus, null, 2));
  } catch (err) {
    console.error(`[reset-status] Errore scrittura status.json per ${projectName}:`, err.message);
    // Non-fatal: proceed with WS broadcast anyway
  }

  const wsMsg = JSON.stringify({
    type: 'hook_status',
    projectPath: project.path,
    projectName,
    status: 'idle',
    timestamp: Date.now()
  });
  clients.forEach(c => { if (c.readyState === 1) c.send(wsMsg); });

  res.json({ success: true });
});

app.post('/api/projects/:projectName/exclude', (req, res) => {
  const { projectName } = req.params;
  const project = config.projects.find(p => p.name === projectName);
  if (!project) return res.status(404).json({ error: 'Progetto non trovato' });

  const excluded = loadExcludedPaths();
  if (!excluded.some(ep => ep.toLowerCase() === project.path.toLowerCase())) {
    excluded.push(project.path);
    saveExcludedPaths(excluded);
  }

  projectWatcher.removeProject(projectName);
  config.projects = config.projects.filter(p => p.name !== projectName);

  // Rimuovi PID salvato per questo progetto
  const pids = loadTerminalPids();
  if (pids[projectName] !== undefined) {
    delete pids[projectName];
    fs.writeFileSync(TERMINAL_PIDS_FILE, JSON.stringify(pids, null, 2));
  }

  broadcastConfigUpdate();

  console.log(`🚫 ${projectName} (${project.path}) escluso`);
  res.json({ success: true, projectName });
});

const TERMINAL_PIDS_FILE = path.join(__dirname, 'terminal-pids.json');

function loadTerminalPids() {
  try {
    if (fs.existsSync(TERMINAL_PIDS_FILE)) return JSON.parse(fs.readFileSync(TERMINAL_PIDS_FILE, 'utf-8'));
  } catch {}
  return {};
}

function saveTerminalPid(projectName, pid) {
  const pids = loadTerminalPids();
  pids[projectName] = pid;
  fs.writeFileSync(TERMINAL_PIDS_FILE, JSON.stringify(pids, null, 2));
}

app.post('/api/projects/:projectName/open-terminal', (req, res) => {
  const { projectName } = req.params;
  const project = config.projects.find(p => p.name === projectName);
  if (!project) return res.status(404).json({ error: 'Progetto non trovato' });
  if (!fs.existsSync(project.path)) return res.status(404).json({ error: 'Directory non trovata' });

  // Lancia cmd e cattura il PID via PowerShell -PassThru
  const psScript = `
$p = Start-Process cmd.exe -ArgumentList '/K','title claude - ${project.name.replace(/'/g, "''")} & cd /d "${project.path.replace(/\\/g, '\\\\')}" & claude' -PassThru
Write-Output $p.Id
`;
  runPsFile(psScript, 8000, (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });
    const pid = parseInt(stdout.trim());
    if (!isNaN(pid)) saveTerminalPid(project.name, pid);
    res.json({ success: true, projectPath: project.path, pid: isNaN(pid) ? null : pid });
  });
});

// ── Leggi slug dalla sessione più recente del progetto ───────
function readProjectSlug(projectPath) {
  try {
    const claudeDirName = projectPath
      .replace(/:\\/g, '--').replace(/\\/g, '-')
      .replace(/\//g, '-').replace(/\s+/g, '-').replace(/^-/, '')
      .replace(/[^\x00-\x7F]/g, c => '-'.repeat(Buffer.byteLength(c, 'utf8')));
    const claudeDir = path.join(
      process.env.USERPROFILE || process.env.HOME,
      '.claude', 'projects', claudeDirName
    );
    if (!fs.existsSync(claudeDir)) return null;
    const files = fs.readdirSync(claudeDir).filter(f => f.endsWith('.jsonl'));
    if (!files.length) return null;
    const latest = files
      .map(f => ({ f, m: fs.statSync(path.join(claudeDir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m)[0].f;
    const lines = fs.readFileSync(path.join(claudeDir, latest), 'utf-8')
      .trim().split('\n').filter(Boolean).reverse();
    for (const line of lines) {
      try { const e = JSON.parse(line); if (e.slug) return e.slug; } catch {}
    }
  } catch {}
  return null;
}

// ── API: Rilevamento finestra terminale ──────────────────────
const pendingTerminalRequests = new Set();

app.get('/api/projects/:projectName/terminal-windows', (req, res) => {
  const { projectName } = req.params;
  const project = config.projects.find(p => p.name === projectName);
  if (!project) return res.status(404).json({ error: 'Progetto non trovato' });

  if (pendingTerminalRequests.has(projectName)) {
    return res.status(429).json({ windows: [], error: 'Ricerca già in corso' });
  }

  // Leggi lo slug dalla sessione corrente per cercare nei titoli finestre
  const slug = readProjectSlug(project.path);
  // Windows Terminal mostra il task nel titolo tab, es: "✦ aggiorna documentazione e repo"
  // Lo slug è tipo "aggiorna-documentazione-repo", lo convertiamo in parole per il confronto
  const slugWords = slug ? slug.replace(/-/g, ' ') : '';

  const savedPid = loadTerminalPids()[project.name] || 0;

  const psScript = `
$projectPath      = '${project.path.replace(/\\/g, '/')}'
$projectName      = '${project.name.replace(/'/g, "''")}'
$savedPid         = ${savedPid}
$sessionsDir      = [System.IO.Path]::Combine($env:USERPROFILE, '.claude', 'sessions')
$claudeProjectsBase = [System.IO.Path]::Combine($env:USERPROFILE, '.claude', 'projects')

$results = @()

# 0. PID salvato dalla dashboard: cmd aperto da "Apri Terminale"
if ($savedPid -gt 0) {
    $proc = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
    if ($proc -and $proc.MainWindowHandle -ne [IntPtr]::Zero) {
        $results += [PSCustomObject]@{ pid=$savedPid; name=$proc.ProcessName; title=$proc.MainWindowTitle; match='dashboard'; claudePid=0; tabIndex=-1 }
    }
}

# 1. Cerca nelle sessioni attive di Claude quella con cwd = projectPath
if (Test-Path $sessionsDir) {
    Get-ChildItem $sessionsDir -Filter '*.json' -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $s = Get-Content $_.FullName -Raw | ConvertFrom-Json
            if ($s.cwd -and $s.cwd.Replace('\','/').ToLower() -eq $projectPath.ToLower() -and $s.pid) {
                # Leggi lo slug dal file .jsonl della sessione (stesso sessionId)
                $slugHint = ''
                if ($s.sessionId) {
                    $jsonlFile = Get-ChildItem $claudeProjectsBase -Recurse -Filter "$($s.sessionId).jsonl" -EA SilentlyContinue | Select-Object -First 1
                    if ($jsonlFile) {
                        $lines = [System.IO.File]::ReadAllLines($jsonlFile.FullName)
                        for ($li = $lines.Length - 1; $li -ge [Math]::Max(0, $lines.Length - 100); $li--) {
                            try { $e = $lines[$li] | ConvertFrom-Json; if ($e.slug) { $slugHint = ($e.slug -replace '-',' ').ToLower(); break } } catch {}
                        }
                    }
                }
                # Risali al terminale padre
                $claudePid = [int]$s.pid
                $cur = $claudePid
                $visited = @{}
                $termPid = 0
                $termName2 = ''

                for ($i = 0; $i -lt 6; $i++) {
                    if ($visited[$cur]) { break }
                    $visited[$cur] = $true
                    $proc = Get-Process -Id $cur -ErrorAction SilentlyContinue
                    if (-not $proc) { break }
                    if ($proc.ProcessName -eq 'WindowsTerminal' -or $proc.ProcessName -eq 'cmd') {
                        $termPid = $cur
                        $termName2 = $proc.ProcessName
                        break
                    }
                    $parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId=$cur" -EA SilentlyContinue).ParentProcessId
                    if (-not $parentPid -or $parentPid -eq $cur) { break }
                    $cur = [int]$parentPid
                }

                if ($termPid -ne 0) {
                    $termProc = Get-Process -Id $termPid -ErrorAction SilentlyContinue
                    if ($termProc -and $termProc.MainWindowHandle -ne [IntPtr]::Zero) {
                        # Usa UIAutomation per trovare la tab esatta in Windows Terminal
                        try {
                            Add-Type -AssemblyName UIAutomationClient -ErrorAction SilentlyContinue
                            Add-Type -AssemblyName UIAutomationTypes -ErrorAction SilentlyContinue
                            $root = [System.Windows.Automation.AutomationElement]::FromHandle($termProc.MainWindowHandle)
                            # Windows Terminal usa ListItem (XAML Islands), non TabItem — proviamo entrambi
                            $tabs = $null
                            foreach ($ct in @([System.Windows.Automation.ControlType]::TabItem, [System.Windows.Automation.ControlType]::ListItem)) {
                                $cond = New-Object System.Windows.Automation.PropertyCondition(
                                    [System.Windows.Automation.AutomationElement]::ControlTypeProperty, $ct)
                                $found = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
                                if ($found.Count -gt 0) { $tabs = $found; break }
                            }
                            if ($tabs -and $tabs.Count -gt 0) {
                                $tabIndex = 0
                                $matchedTabs = @()
                                $allTabsList = @()
                                foreach ($tab in $tabs) {
                                    $tabTitle = $tab.Current.Name
                                    $entry = [PSCustomObject]@{
                                        pid=$termPid; name=$termProc.ProcessName
                                        title=$tabTitle; match='tab'
                                        tabIndex=$tabIndex
                                    }
                                    $allTabsList += $entry
                                    # Filtra per slug: normalizza e controlla overlap parole significative
                                    if ($slugHint -ne '') {
                                        $titleNorm = ($tabTitle.ToLower() -replace '[^a-z0-9 ]',' ' -replace '\s+',' ').Trim()
                                        $slugNorm  = ($slugHint.ToLower() -replace '[^a-z0-9 ]',' ' -replace '\s+',' ').Trim()
                                        $sigWords = ($slugNorm -split '\s+') | Where-Object { $_.Length -ge 4 }
                                        $hits = ($sigWords | Where-Object { $titleNorm -like "*$_*" }).Count
                                        if ($hits -ge [Math]::Min(2, [Math]::Max(1, $sigWords.Count))) {
                                            $matchedTabs += $entry
                                        }
                                    }
                                    $tabIndex++
                                }
                                if ($matchedTabs.Count -gt 0) {
                                    $results += $matchedTabs
                                } else {
                                    $results += $allTabsList
                                }
                            } else {
                                # Nessuna tab trovata via UIAutomation: mostra solo la finestra WT
                                $results += [PSCustomObject]@{ pid=$termPid; name=$termProc.ProcessName; title=$termProc.MainWindowTitle; match='terminale'; tabIndex=-1 }
                            }
                        } catch {
                            $results += [PSCustomObject]@{ pid=$termPid; name=$termProc.ProcessName; title=$termProc.MainWindowTitle; match='terminale'; tabIndex=-1 }
                        }
                    }
                }
            }
        } catch {}
    }
}

# 2. Fallback: cerca finestra cmd con titolo = nome progetto (aperta dalla dashboard)
if ($results.Count -eq 0) {
    Get-Process -Name 'cmd' -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.MainWindowTitle -and $_.MainWindowTitle.ToLower() -eq $projectName.ToLower()) {
            $results += [PSCustomObject]@{ pid=$_.Id; name=$_.ProcessName; title=$_.MainWindowTitle; match='progetto'; claudePid=0; tabIndex=-1 }
        }
    }
}
# 3. Fallback titolo parziale: nome progetto o cartella contenuta nel titolo
if ($results.Count -eq 0) {
    $projLeaf = [System.IO.Path]::GetFileName($projectPath.TrimEnd('/\'))
    Get-Process -Name 'WindowsTerminal','cmd' -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.MainWindowTitle) {
            $titleLow = $_.MainWindowTitle.ToLower()
            $isMatch = ($projectName -ne '' -and $titleLow -like "*$($projectName.ToLower())*") -or
                       ($projLeaf   -ne '' -and $titleLow -like "*$($projLeaf.ToLower())*")
            if ($isMatch) {
                $results += [PSCustomObject]@{ pid=$_.Id; name=$_.ProcessName; title=$_.MainWindowTitle; match='progetto'; claudePid=0; tabIndex=-1 }
            }
        }
    }
}
# 4. Ultimo fallback: tutti i terminali visibili
if ($results.Count -eq 0) {
    Get-Process -Name 'WindowsTerminal','cmd' -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.MainWindowTitle) {
            $results += [PSCustomObject]@{ pid=$_.Id; name=$_.ProcessName; title=$_.MainWindowTitle; match='fallback'; claudePid=0; tabIndex=-1 }
        }
    }
}

if ($results.Count -eq 0) { '[]' } else { $results | ConvertTo-Json -Depth 1 -Compress }
`;

  pendingTerminalRequests.add(projectName);
  runPsFile(psScript, 10000, (error, stdout, stderr) => {
    pendingTerminalRequests.delete(projectName);
    if (error) {
      console.error('PS error:', error.message, stderr);
      return res.json({ windows: [], error: error.message });
    }
    try {
      const trimmed = stdout.trim();
      if (!trimmed || trimmed === '[]') {
        // PID salvato non trovato: processo morto, pulizia
        if (savedPid > 0) {
          const pids = loadTerminalPids();
          if (pids[project.name] !== undefined) {
            delete pids[project.name];
            fs.writeFileSync(TERMINAL_PIDS_FILE, JSON.stringify(pids, null, 2));
          }
        }
        return res.json({ windows: [] });
      }
      const raw = JSON.parse(trimmed);
      const windows = Array.isArray(raw) ? raw : [raw];

      // Se il PID salvato non è presente nei risultati come match 'dashboard', è morto
      if (savedPid > 0 && !windows.some(w => w.pid === savedPid && w.match === 'dashboard')) {
        const pids = loadTerminalPids();
        if (pids[project.name] !== undefined) {
          delete pids[project.name];
          fs.writeFileSync(TERMINAL_PIDS_FILE, JSON.stringify(pids, null, 2));
        }
      }

      res.json({ windows });
    } catch {
      res.json({ windows: [] });
    }
  });
});

// ── API: Porta finestra in primo piano ──────────────────────
app.post('/api/focus-window/:pid', (req, res) => {
  const pid = parseInt(req.params.pid);
  if (isNaN(pid)) return res.status(400).json({ error: 'PID non valido' });

  const title = (req.body?.title || '').replace(/'/g, "''"); // escape single quotes
  const tabIdx = Number.isInteger(req.body?.tabIndex) ? req.body.tabIndex : -1;

  const psScript = `
$targetPid = ${pid}
$titleHint  = '${title}'
$tabIdx     = ${tabIdx}

Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class ForceWindow {
    [DllImport("user32.dll")] static extern bool EnumWindows(WndProc e, IntPtr p);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] static extern int  GetWindowText(IntPtr h, StringBuilder b, int n);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int cmd);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
    public delegate bool WndProc(IntPtr h, IntPtr p);

    public static long FindByPid(uint targetPid) {
        long found = 0;
        EnumWindows((h, p) => {
            if (!IsWindowVisible(h)) return true;
            uint pid2 = 0; GetWindowThreadProcessId(h, out pid2);
            if (pid2 == targetPid) { found = h.ToInt64(); return false; }
            return true;
        }, IntPtr.Zero);
        return found;
    }
    public static long FindByTitle(string partial) {
        long found = 0;
        EnumWindows((h, p) => {
            if (!IsWindowVisible(h)) return true;
            var b = new StringBuilder(512); GetWindowText(h, b, 512);
            if (b.Length > 0 && b.ToString().IndexOf(partial, StringComparison.OrdinalIgnoreCase) >= 0)
                { found = h.ToInt64(); return false; }
            return true;
        }, IntPtr.Zero);
        return found;
    }
    public static bool Focus(long hwndLong) {
        var h = new IntPtr(hwndLong);
        ShowWindow(h, 9);
        // ALT press/release: Windows concede il permesso SetForegroundWindow al thread corrente
        keybd_event(0x12, 0, 0, UIntPtr.Zero);   // ALT down
        keybd_event(0x12, 0, 2, UIntPtr.Zero);   // ALT up
        return SetForegroundWindow(h);
    }
}
'@

function GetParentPid([int]$p) {
    try { $r=(Get-CimInstance Win32_Process -Filter "ProcessId=$p" -EA SilentlyContinue).ParentProcessId; if($r){[int]$r}else{0} } catch{0}
}

$hwnd=[long]0; $cur=$targetPid; $seen=@{}
for($i=0;$i-lt6-and$hwnd-eq0;$i++){
    if($seen[$cur]){break}; $seen[$cur]=$true
    $hwnd=[ForceWindow]::FindByPid([uint]$cur)
    if($hwnd-eq0){ $nx=GetParentPid $cur; if($nx-eq0-or$nx-eq$cur){break}; $cur=$nx }
}
if($hwnd-eq0-and$titleHint-ne''){ $hwnd=[ForceWindow]::FindByTitle($titleHint) }

if ($hwnd -ne 0) {
    $ok = [ForceWindow]::Focus($hwnd)
    # Se specificato un tab index, seleziona la tab via UIAutomation
    if ($tabIdx -ge 0) {
        try {
            Add-Type -AssemblyName UIAutomationClient -EA SilentlyContinue
            Add-Type -AssemblyName UIAutomationTypes -EA SilentlyContinue
            Start-Sleep -Milliseconds 200
            $aeRoot = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$hwnd)
            $tabCond = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
                [System.Windows.Automation.ControlType]::TabItem)
            $tabs = $aeRoot.FindAll([System.Windows.Automation.TreeScope]::Descendants, $tabCond)
            if ($tabIdx -lt $tabs.Count) {
                $tab = $tabs[$tabIdx]
                try {
                    $sp = $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
                    $sp.Select()
                } catch {
                    try {
                        $ip = $tab.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
                        $ip.Invoke()
                    } catch {}
                }
            }
        } catch {}
    }
    if ($ok) { 'ok' } else { 'focus_failed' }
} else { 'not_found' }
`;

  runPsFile(psScript, 10000, (error, stdout) => {
    if (error) return res.status(500).json({ error: error.message });
    const result = stdout.trim();
    if (result === 'not_found') return res.status(404).json({ error: 'Finestra non trovata' });
    res.json({ success: true });
  });
});

// ── API: Debug finestre ──────────────────────────────────────
app.get('/api/debug/windows', (req, res) => {
  const psScript = `
Add-Type -TypeDefinition @'
using System; using System.Text; using System.Collections.Generic; using System.Runtime.InteropServices;
public class WinDbg {
    [DllImport("user32.dll")] static extern bool EnumWindows(WndProc e, IntPtr p);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] static extern int GetWindowText(IntPtr h, StringBuilder b, int n);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    public delegate bool WndProc(IntPtr h, IntPtr p);
    public static List<string> Scan() {
        var r = new List<string>();
        EnumWindows((h,p) => {
            if(!IsWindowVisible(h)) return true;
            var b=new StringBuilder(512);
            if(GetWindowText(h,b,512)>0){uint pid=0;GetWindowThreadProcessId(h,out pid);r.Add(pid+"|"+b);}
            return true;
        }, IntPtr.Zero);
        return r;
    }
}
'@
$procMap=@{}; Get-Process -EA SilentlyContinue | ForEach-Object { $procMap[$_.Id]=$_.ProcessName }
$all = [WinDbg]::Scan() | ForEach-Object {
    $p=$_ -split '\\|',2; $pid=[int]$p[0]; $title=$p[1]
    $name=if($procMap.ContainsKey($pid)){$procMap[$pid]}else{'unknown'}
    [PSCustomObject]@{pid=$pid;name=$name;title=$title}
}
$all | ConvertTo-Json -Depth 1 -Compress
`;
  runPsFile(psScript, 15000, (error, stdout, stderr) => {
      if (error) return res.json({ error: error.message, stderr });
      try {
        const raw = JSON.parse(stdout.trim() || '[]');
        const windows = Array.isArray(raw) ? raw : [raw];
        res.json({ total: windows.length, windows });
      } catch {
        res.json({ error: 'parse failed', raw: stdout.trim().substring(0, 500) });
      }
    }
  );
});

// ── API: Admin - Scan Paths ──────────────────────────────────
app.get('/api/admin/scan-paths', (req, res) => {
  res.json({ paths: loadScanPaths() });
});

app.post('/api/admin/scan-paths', (req, res) => {
  const { path: newPath } = req.body;
  if (!newPath || typeof newPath !== 'string') {
    return res.status(400).json({ error: 'Path non valido' });
  }
  const paths = loadScanPaths();
  if (!paths.some(p => p.toLowerCase() === newPath.toLowerCase())) {
    paths.push(newPath);
    saveScanPaths(paths);
  }
  res.json({ success: true, paths });
});

app.delete('/api/admin/scan-paths/:index', (req, res) => {
  const idx = parseInt(req.params.index);
  const paths = loadScanPaths();
  if (isNaN(idx) || idx < 0 || idx >= paths.length) {
    return res.status(400).json({ error: 'Indice non valido' });
  }
  paths.splice(idx, 1);
  saveScanPaths(paths);
  res.json({ success: true, paths });
});

app.post('/api/admin/rescan', (req, res) => {
  const currentScanPaths = loadScanPaths();
  const currentExcluded = loadExcludedPaths();

  if (currentScanPaths.length === 0) {
    return res.json({ added: 0, total: config.projects.length });
  }

  const discovered = discoverFromRoots(currentScanPaths, currentExcluded);
  const existingPaths = new Set(config.projects.map(p => p.path.toLowerCase()));

  let added = 0;
  for (const project of discovered) {
    if (!existingPaths.has(project.path.toLowerCase())) {
      config.projects.push(project);
      projectWatcher.addNewProject(project);
      added++;
    }
  }

  if (added > 0) broadcastConfigUpdate();

  console.log(`🔄 Rescan: trovati ${discovered.length}, aggiunti ${added} nuovi`);
  res.json({ added, total: config.projects.length, found: discovered.length });
});

app.get('/api/admin/excluded-paths', (req, res) => {
  res.json({ paths: loadExcludedPaths() });
});

app.delete('/api/admin/excluded-paths/:index', (req, res) => {
  const idx = parseInt(req.params.index);
  const paths = loadExcludedPaths();
  if (isNaN(idx) || idx < 0 || idx >= paths.length) {
    return res.status(400).json({ error: 'Indice non valido' });
  }
  paths.splice(idx, 1);
  saveExcludedPaths(paths);
  res.json({ success: true, paths });
});

// ── API: Admin - Wiki Settings ───────────────────────────────
app.get('/api/admin/wiki-settings', (req, res) => {
  res.json(loadWikiSettings());
});

app.post('/api/admin/wiki-settings', (req, res) => {
  const { wikiPath, categories, defaultCategory, sessionFilter, excludeFilter } = req.body;
  const current = loadWikiSettings();
  const updated = {
    ...current,
    ...(wikiPath         !== undefined && { wikiPath: wikiPath.trim() }),
    ...(categories       !== undefined && { categories }),
    ...(defaultCategory  !== undefined && { defaultCategory }),
    ...(sessionFilter    !== undefined && { sessionFilter }),
    ...(excludeFilter    !== undefined && { excludeFilter }),
  };
  saveWikiSettings(updated);
  res.json({ success: true, ...updated });
});

// add / remove a single category
app.post('/api/admin/wiki-settings/categories', (req, res) => {
  const { name, label, match } = req.body;
  if (!name || !label || !Array.isArray(match)) {
    return res.status(400).json({ error: 'name, label, match[] richiesti' });
  }
  const settings = loadWikiSettings();
  if (settings.categories.some(c => c.name === name)) {
    return res.status(400).json({ error: `Categoria "${name}" già esistente` });
  }
  settings.categories.push({ name, label, match });
  saveWikiSettings(settings);
  res.json({ success: true, categories: settings.categories });
});

app.delete('/api/admin/wiki-settings/categories/:name', (req, res) => {
  const settings = loadWikiSettings();
  settings.categories = settings.categories.filter(c => c.name !== req.params.name);
  saveWikiSettings(settings);
  res.json({ success: true, categories: settings.categories });
});

function cwdToProjectName(cwd) {
  return cwd.replace(/\//g, '\\').replace(/[^a-zA-Z0-9]/g, '-');
}

app.post('/api/admin/wiki-ingest-latest', async (req, res) => {
  const { cwd } = req.body || {};
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const projectName = cwdToProjectName(cwd);
  const sessions = listSessions({ project: projectName, limit: 1 });
  if (sessions.length === 0) return res.status(404).json({ error: `Nessuna sessione trovata per: ${projectName}` });
  const session = sessions[0];
  wikiIngest(session.id, projectName)
    .then(() => console.log(`[wiki-ingest-latest] done: ${projectName}`))
    .catch(err => console.error(`[wiki-ingest-latest] error: ${err.message}`));
  res.json({ success: true, project: projectName, sessionId: session.id });
});

app.post('/api/admin/wiki-backfill', (req, res) => {
  const backfillScript = path.join(__dirname, 'wiki-backfill.js');
  const child = spawn(process.execPath, ['--env-file=.env', backfillScript], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', d => process.stdout.write(`[backfill] ${d}`));
  child.stderr.on('data', d => process.stderr.write(`[backfill] ${d}`));
  child.on('error', err => console.error(`[backfill] spawn error: ${err.message}`));
  child.on('exit', code => console.log(`[backfill] exited with code ${code}`));
  res.json({ success: true, message: 'Backfill avviato in background' });
});

// ── REST: Sessions ───────────────────────────────────
app.get('/api/sessions', (req, res) => {
  try {
    const { project, limit = '20', offset = '0' } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 200);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    const sessions = listSessions({ project, limit: parsedLimit, offset: parsedOffset });
    res.json(sessions);
  } catch (err) {
    console.error('GET /api/sessions error:', err.message);
    res.json([]);
  }
});

app.get('/api/sessions/:id', (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Not found' });
    const { limit = '50', offset = '0' } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 2000);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    const messages = getMessages(req.params.id, { limit: parsedLimit, offset: parsedOffset });
    res.json({ ...session, messages });
  } catch (err) {
    console.error('GET /api/sessions/:id error:', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/sessions/:id/messages', (req, res) => {
  try {
    const { limit = '50', offset = '0' } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);
    const messages = getMessages(req.params.id, { limit: parsedLimit, offset: parsedOffset });
    res.json(messages);
  } catch (err) {
    console.error('GET /api/sessions/:id/messages error:', err.message);
    res.json([]);
  }
});

app.get('/api/sessions/:id/export', (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) return res.status(404).send('Not found');
    const messages = getMessages(req.params.id, { limit: 10000 });

    const escHtml = s => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const msgsHtml = messages.map(m => {
      const tools = (() => { try { return JSON.parse(m.tools_used || '[]'); } catch { return []; } })();
      const toolChips = tools.map(t => `<span class="tool-chip">${escHtml(t)}</span>`).join('');
      return `<div class="msg msg-${escHtml(m.role)}">
  <div class="msg-role">${escHtml(m.role)}${toolChips}</div>
  <div class="msg-content">${escHtml(m.content)}</div>
</div>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>${escHtml(session.project)} — Claude Code Session</title>
<style>
  body{background:#090b12;color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:13px;padding:32px;max-width:900px;margin:0 auto}
  h1{font-size:1.1rem;color:#f8fafc;margin-bottom:4px}
  .meta{font-size:0.75rem;color:#64748b;margin-bottom:24px}
  .msg{border:1px solid #1e293b;border-radius:8px;padding:14px 16px;margin-bottom:12px}
  .msg-user{border-color:#1e3a5f;background:rgba(30,58,95,0.15)}
  .msg-assistant{border-color:#1a2e1a;background:rgba(20,40,20,0.15)}
  .msg-role{font-size:0.65rem;letter-spacing:.1em;text-transform:uppercase;color:#475569;margin-bottom:8px;display:flex;align-items:center;gap:6px}
  .msg-user .msg-role{color:#60a5fa}
  .msg-assistant .msg-role{color:#4ade80}
  .msg-content{white-space:pre-wrap;line-height:1.6;color:#cbd5e1}
  .tool-chip{background:rgba(100,181,246,0.12);color:#64b5f6;border:1px solid rgba(100,181,246,0.3);border-radius:4px;padding:1px 6px;font-size:0.6rem}
</style>
</head>
<body>
<h1>${escHtml(session.project)}</h1>
<div class="meta">${new Date(session.updated_at).toLocaleString('it-IT')} · ${session.message_count} messaggi</div>
${msgsHtml}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${session.project.replace(/[^a-z0-9]/gi, '_')}_session.html"`);
    res.send(html);
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).send('Error');
  }
});

// ── REST: Search ─────────────────────────────────────
app.get('/api/search', (req, res) => {
  try {
    const { q = '', limit = '20' } = req.query;
    if (!q.trim()) return res.json([]);
    const results = searchMessages(q.trim(), parseInt(limit));
    res.json(results);
  } catch (err) {
    console.error('Search error:', err.message);
    res.json([]);
  }
});

// ── REST: Analytics ──────────────────────────────────
app.get('/api/analytics', (req, res) => {
  try {
    res.json(getAnalytics());
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.json({ heatmap: [], toolUsage: [], projectBreakdown: [] });
  }
});

// ── REST: Hook Events ────────────────────────────────
app.post('/api/hook-event', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body.hook_event_name !== 'string') {
      return res.status(400).json({ error: 'missing hook_event_name' });
    }

    const { hook_event_name, tool_name, tool_response } = body;
    // Claude Code sends 'cwd' (not 'project_path') — support both
    const project_path = body.cwd || body.project_path || '';

    // Derive project name: match against known projects, fallback to basename
    const projectName = (() => {
      const match = config.projects.find(p =>
        p.path && (p.path === project_path || path.basename(p.path) === path.basename(project_path))
      );
      const base = path.basename(project_path);
      return match?.name ?? (base && base !== '.' ? base : 'Unknown');
    })();

    // Map hook event → status
    const statusMap = {
      PreToolUse: 'active',
      Notification: 'waiting',
      Stop: 'review'
      // PostToolUse: no ws broadcast — only triggers Telegram on Bash error
    };
    const hookStatus = statusMap[hook_event_name];

    // Broadcast hook_status for PreToolUse, Notification, Stop
    if (hookStatus) {
      const wsMsg = JSON.stringify({
        type: 'hook_status',
        projectPath: project_path,
        projectName,
        status: hookStatus,
        timestamp: Date.now()
      });
      clients.forEach(c => { if (c.readyState === 1) c.send(wsMsg); });
    }

    // Telegram: notify on Stop
    if (hook_event_name === 'Stop') {
      await sendTelegram(`✅ <b>${projectName}</b> — sessione terminata`);
    }

    // Telegram: notify on Bash error (PostToolUse, exit_code !== 0)
    if (
      hook_event_name === 'PostToolUse' &&
      tool_name === 'Bash' &&
      typeof tool_response?.exit_code === 'number' &&
      tool_response.exit_code !== 0
    ) {
      const cmd = body.tool_input?.command ?? '(sconosciuto)';
      const short = cmd.length > 80 ? cmd.slice(0, 80) + '…' : cmd;
      await sendTelegram(`💥 <b>${projectName}</b> — errore Bash (exit ${tool_response.exit_code})\n<code>${short}</code>`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[hook-event] error:', err.message);
    res.status(500).json({ error: 'internal error' });
  }
});

// ── Avvio ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Dashboard Claude Code Backend');
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`📊 ${config.projects.length} progetti monitorati`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

process.on('SIGINT', () => {
  projectWatcher.stop();
  server.close(() => process.exit(0));
});
