import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { linuxPathToClaudeDirName, linuxPathToUnc, getClaudeProjectsDirUnc } from './wsl-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCAN_PATHS_FILE = path.join(__dirname, 'scan-paths.json');

export function loadScanPaths() {
  try {
    if (fs.existsSync(SCAN_PATHS_FILE)) {
      return JSON.parse(fs.readFileSync(SCAN_PATHS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

export function saveScanPaths(paths) {
  fs.writeFileSync(SCAN_PATHS_FILE, JSON.stringify(paths, null, 2));
}

/**
 * Scansiona percorsi radice Linux (in WSL) via UNC e trova sottocartelle
 * con sessioni Claude Code attive.
 *
 * @param {string[]} rootPaths - Path Linux (es. "/home/thomas")
 * @param {string[]} excludedPaths - Path Linux da escludere
 * @returns {Array<{name, path, claudeDir, sessionCount}>}
 */
export function discoverFromRoots(rootPaths, excludedPaths = [], maxDepth = 2) {
  const projects = [];
  const seenPaths = new Set();
  const seenNames = new Map();

  const claudeProjectsUnc = getClaudeProjectsDirUnc();
  if (!fs.existsSync(claudeProjectsUnc)) {
    console.log('⚠️  Directory sessioni Claude WSL non trovata:', claudeProjectsUnc);
    return projects;
  }

  console.log('🗂️  Scansione percorsi radice WSL...');

  function scanDir(linuxDir, depth) {
    const uncDir = linuxPathToUnc(linuxDir);
    let entries;
    try {
      entries = fs.readdirSync(uncDir, { withFileTypes: true })
        .filter(d => d.isDirectory());
    } catch {
      return;
    }

    for (const entry of entries) {
      const linuxFull = `${linuxDir}/${entry.name}`.replace(/\/+/g, '/');

      if (excludedPaths.some(ep => ep === linuxFull)) continue;
      if (seenPaths.has(linuxFull)) continue;

      const claudeDirName = linuxPathToClaudeDirName(linuxFull);
      const claudeProjectDir = path.join(claudeProjectsUnc, claudeDirName);

      if (fs.existsSync(claudeProjectDir)) {
        let sessionFiles;
        try {
          sessionFiles = fs.readdirSync(claudeProjectDir).filter(f => f.endsWith('.jsonl'));
        } catch {
          sessionFiles = [];
        }

        if (sessionFiles.length > 0) {
          seenPaths.add(linuxFull);

          let name = entry.name;
          if (seenNames.has(name.toLowerCase())) {
            const parentName = linuxDir.split('/').pop() || 'root';
            name = `${parentName}-${entry.name}`;
          }
          seenNames.set(name.toLowerCase(), true);

          projects.push({
            name,
            path: linuxFull,
            claudeDir: claudeDirName,
            sessionCount: sessionFiles.length
          });
          continue;
        }
      }

      if (depth < maxDepth) {
        scanDir(linuxFull, depth + 1);
      }
    }
  }

  for (const rootPath of rootPaths) {
    const uncRoot = linuxPathToUnc(rootPath);
    if (!fs.existsSync(uncRoot)) {
      console.log(`  ⚠️  Percorso non trovato: ${rootPath} (${uncRoot})`);
      continue;
    }
    const before = projects.length;
    scanDir(rootPath, 1);
    console.log(`  📁 ${rootPath}: ${projects.length - before} progetti con sessioni`);
  }

  console.log(`\n✅ Totale trovati: ${projects.length} progetti\n`);
  return projects;
}

/**
 * Controlla se un singolo path Linux ha sessioni Claude attive.
 */
export function hasClaudeSession(linuxProjectPath) {
  const claudeDirName = linuxPathToClaudeDirName(linuxProjectPath);
  const claudeProjectDir = path.join(getClaudeProjectsDirUnc(), claudeDirName);
  if (!fs.existsSync(claudeProjectDir)) return false;
  try {
    return fs.readdirSync(claudeProjectDir).some(f => f.endsWith('.jsonl'));
  } catch {
    return false;
  }
}
