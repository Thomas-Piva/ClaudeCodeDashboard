/**
 * wiki-backfill.js
 * Generates wiki pages from all indexed sessions using wiki-settings.json.
 * For each project, extracts source files actually touched in sessions (via
 * tool_use blocks in raw JSONL) and passes them alongside session messages.
 * Run: node --env-file=.env wiki-backfill.js
 */

import Database from 'better-sqlite3';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const DB_PATH       = path.join(import.meta.dirname, 'agentsview.db');
const SETTINGS_FILE = path.join(import.meta.dirname, 'wiki-settings.json');
const MAX_CHARS_PER_SESSION = 8000;
const SESSIONS_PER_TOPIC    = 5;
const MAX_SOURCE_FILES       = 8;
const MAX_FILE_CHARS         = 2000;
const DEFAULT_SOURCE_EXTS    = ['.vb', '.cs', '.ts', '.js', '.py', '.jsx', '.tsx', '.java', '.go'];

function buildClient(provider) {
  const apiKey = provider.apiKeyEnv ? (process.env[provider.apiKeyEnv] || 'no-key') : 'no-key';
  return new OpenAI({ baseURL: provider.baseURL, apiKey });
}

// ── Load settings ──────────────────────────────────────────────────────────
function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    return { wikiPath: 'C:\\wiki', categories: [], defaultCategory: 'generale', sessionFilter: [], excludeFilter: [] };
  }
}

// ── Directory structure from settings ─────────────────────────────────────
function ensureWikiDirs(settings) {
  const dirs = settings.categories.map(c => c.name);
  if (settings.defaultCategory) dirs.push(settings.defaultCategory);
  for (const d of dirs) fs.mkdirSync(path.join(settings.wikiPath, d), { recursive: true });
}

// ── Categorize project ─────────────────────────────────────────────────────
function categorize(project, settings) {
  for (const cat of settings.categories) {
    if (cat.match.some(p => project.toLowerCase().includes(p.toLowerCase()))) return cat.name;
  }
  return settings.defaultCategory || 'generale';
}

function topicFromProject(project) {
  const base = project.split('-').slice(-2).join('-').toLowerCase();
  return base.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ── DB queries ─────────────────────────────────────────────────────────────
function getSessions(settings) {
  const db = new Database(DB_PATH, { readonly: true });
  const includePatterns = settings.sessionFilter || [];
  const excludePatterns = settings.excludeFilter || [];
  const includeClauses  = includePatterns.map(() => `s.project LIKE ?`).join(' OR ');
  const excludeClauses  = excludePatterns.map(() => `s.project NOT LIKE ?`).join(' AND ');
  const whereInclude    = includeClauses ? `(${includeClauses})` : '1=1';
  const whereExclude    = excludeClauses ? `AND ${excludeClauses}` : '';
  const sql = `
    SELECT DISTINCT s.id, s.project, s.updated_at, s.file_path
    FROM sessions s
    WHERE ${whereInclude} ${whereExclude}
    ORDER BY s.project, s.updated_at DESC
  `;
  const rows = db.prepare(sql).all(
    ...includePatterns.map(p => `%${p}%`),
    ...excludePatterns.map(p => `%${p}%`)
  );
  db.close();
  return rows;
}

function getSessionMessages(sessionId) {
  const db = new Database(DB_PATH, { readonly: true });
  const msgs = db.prepare(`SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC`).all(sessionId);
  db.close();
  return msgs;
}

// ── Extract source files from raw JSONL tool_use blocks ───────────────────
function extractFilesFromJSONL(jsonlPath, sourceExts) {
  const files = new Set();
  try {
    const lines = fs.readFileSync(jsonlPath, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.type !== 'assistant') continue;
        for (const block of (obj.message?.content || [])) {
          if (block.type !== 'tool_use') continue;
          const fp = block.input?.file_path || block.input?.path;
          if (!fp || typeof fp !== 'string') continue;
          const ext = path.extname(fp).toLowerCase();
          if (sourceExts.includes(ext)) files.add(fp.replace(/\//g, path.sep));
        }
      } catch {}
    }
  } catch {}
  return [...files];
}

// ── Read source files from disk ────────────────────────────────────────────
function readSourceFiles(filePaths, sourceExts) {
  const result = [];
  const seen   = new Set();
  for (const fp of filePaths) {
    if (seen.has(fp)) continue;
    seen.add(fp);
    if (result.length >= MAX_SOURCE_FILES) break;
    const ext = path.extname(fp).toLowerCase();
    if (!sourceExts.includes(ext)) continue;
    try {
      const content = fs.readFileSync(fp, 'utf8');
      result.push({ path: fp, content: content.substring(0, MAX_FILE_CHARS) });
    } catch {}
  }
  return result;
}

// ── Build session text ─────────────────────────────────────────────────────
function buildSessionText(messages) {
  let text = '';
  for (const m of messages) {
    text += (m.role === 'user' ? '>> USER:\n' : '>> ASSISTANT:\n');
    text += (m.content || '').substring(0, 1500) + '\n\n';
    if (text.length > MAX_CHARS_PER_SESSION) break;
  }
  return text.substring(0, MAX_CHARS_PER_SESSION);
}

// ── System prompt ──────────────────────────────────────────────────────────
function buildSystemPrompt(settings) {
  if (settings.systemPrompt) return settings.systemPrompt;
  const categoryList = settings.categories.map(c => `- **${c.name}** (${c.label}): ${c.match.join(', ')}`).join('\n');
  return `Sei un agente di estrazione della conoscenza tecnica.
Analizza sessioni di lavoro con Claude Code ed estrai SOLO informazioni presenti nelle sessioni e nei file forniti.
Rispondi SOLO con una pagina Markdown. Categorie wiki:\n${categoryList}`;
}

// ── Call LLM API ──────────────────────────────────────────────────────────
async function extractKnowledge(project, sessionTexts, sourceFiles, systemPrompt, client, model) {
  let userContent = `Progetto: ${project}\n\n`;

  if (sourceFiles.length > 0) {
    userContent += `--- FILE SORGENTE TOCCATI NELLE SESSIONI (${sourceFiles.length} file) ---\n`;
    for (const f of sourceFiles) {
      const shortPath = f.path.split(path.sep).slice(-3).join('/');
      userContent += `\n### ${shortPath}\n\`\`\`\n${f.content}\n\`\`\`\n`;
    }
    userContent += '\n';
  }

  userContent += sessionTexts.map((t, i) => `--- SESSIONE ${i + 1} ---\n${t}`).join('\n\n');

  const response = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent },
    ],
  });

  const markdown = response.choices[0]?.message?.content ?? '';
  if (!markdown.trim()) throw new Error('Empty response');
  return markdown;
}

// ── Anti-template filter ───────────────────────────────────────────────────
const TEMPLATE_SIGNALS = [
  'src/components/', 'npm run build', 'npm run test', 'React.FC<',
  'jest', 'webpack', 'tree-shaking', 'TypeScript strict',
  'useReducer', 'Context API', 'CSS Modules',
];

function isTemplateContent(markdown) {
  return TEMPLATE_SIGNALS.filter(s => markdown.includes(s)).length >= 3;
}

function normalizeHeading(h) {
  return h.replace(/^#+\s*/, '').toLowerCase().trim();
}

// ── Write / merge wiki page ────────────────────────────────────────────────
function writeWikiPage(wikiPath, category, topic, markdown) {
  if (isTemplateContent(markdown)) {
    console.log(`  ⚠ skipped (template content): ${topic}.md`);
    return;
  }

  const dir  = path.join(wikiPath, category);
  const file = path.join(dir, `${topic}.md`);

  if (fs.existsSync(file)) {
    const existing     = fs.readFileSync(file, 'utf8');
    const existingNorm = new Set((existing.match(/^#{2,3} .+/gm) || []).map(normalizeHeading));
    const newHeadings  = (markdown.match(/^#{2,3} .+/gm) || []).filter(h => !existingNorm.has(normalizeHeading(h)));
    if (newHeadings.length === 0) { console.log(`  ↔ unchanged: ${topic}.md`); return; }
    const newSections = newHeadings.map(h => {
      const idx  = markdown.indexOf(h);
      const next = markdown.indexOf('\n## ', idx + 1);
      return markdown.slice(idx, next === -1 ? undefined : next).trim();
    }).join('\n\n');
    fs.appendFileSync(file, '\n\n---\n\n' + newSections);
    console.log(`  ↑ updated: ${category}/${topic}.md (+${newHeadings.length} sezioni)`);
  } else {
    fs.writeFileSync(file, markdown);
    console.log(`  + created: ${category}/${topic}.md`);
  }
}

// ── Group sessions by project ──────────────────────────────────────────────
function groupByProject(sessions) {
  const map = new Map();
  for (const s of sessions) {
    if (!map.has(s.project)) map.set(s.project, []);
    map.get(s.project).push(s);
  }
  return map;
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const settings   = loadSettings();
  const provider   = settings.provider || { baseURL: 'https://api.deepseek.com', model: 'deepseek-chat', apiKeyEnv: 'DEEPSEEK_API_KEY' };
  const client     = buildClient(provider);
  const model      = provider.model;
  const sourceExts = settings.sourceExtensions || DEFAULT_SOURCE_EXTS;

  console.log('Wiki Backfill');
  console.log('=============');
  console.log(`DB:         ${DB_PATH}`);
  console.log(`Wiki:       ${settings.wikiPath}`);
  console.log(`Provider:   ${provider.baseURL}`);
  console.log(`Model:      ${model}`);
  console.log(`Categories: ${settings.categories.map(c => c.name).join(', ')}`);
  console.log(`Filter:     ${settings.sessionFilter.join(', ')}`);
  console.log(`Source ext: ${sourceExts.join(', ')}\n`);

  ensureWikiDirs(settings);

  const sessions  = getSessions(settings);
  console.log(`Found ${sessions.length} sessions\n`);

  const byProject = groupByProject(sessions);
  console.log(`Projects: ${byProject.size}\n`);

  const systemPrompt = buildSystemPrompt(settings);
  let processed = 0, errors = 0;

  for (const [project, projectSessions] of byProject) {
    const category = categorize(project, settings);
    const topic    = topicFromProject(project);
    console.log(`[${category}] ${project} (${projectSessions.length} sessions)`);

    const toProcess    = projectSessions.slice(0, SESSIONS_PER_TOPIC);
    const sessionTexts = toProcess
      .map(s => buildSessionText(getSessionMessages(s.id)))
      .filter(t => t.length > 100);

    if (sessionTexts.length === 0) { console.log('  ⊘ no usable content, skip'); continue; }

    // Extract source files actually touched in these sessions
    const allFilePaths = [...new Set(
      toProcess
        .map(s => s.file_path)
        .filter(Boolean)
        .flatMap(jp => extractFilesFromJSONL(jp, sourceExts))
    )];
    const sourceFiles = readSourceFiles(allFilePaths, sourceExts);
    if (sourceFiles.length > 0) console.log(`  files: ${sourceFiles.length} (${sourceFiles.map(f => path.basename(f.path)).join(', ')})`);

    try {
      const markdown = await extractKnowledge(project, sessionTexts, sourceFiles, systemPrompt, client, model);
      writeWikiPage(settings.wikiPath, category, topic, markdown);
      processed++;
    } catch (err) {
      console.error(`  ✗ error: ${err.message}`);
      errors++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✓ Done. Processed: ${processed}, Errors: ${errors}`);
  console.log(`Wiki at: ${settings.wikiPath}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
