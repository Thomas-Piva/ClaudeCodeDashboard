/**
 * wiki-ingest.js
 * Incremental wiki update — called after indexSession().
 * Uses the same provider/settings as wiki-backfill.js.
 */

import OpenAI from 'openai';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_PATH            = path.join(import.meta.dirname, 'agentsview.db');
const SETTINGS_FILE      = path.join(import.meta.dirname, 'wiki-settings.json');
const MAX_CHARS          = 6000;
const MAX_SOURCE_FILES   = 6;
const MAX_FILE_CHARS     = 2000;
const DEFAULT_SOURCE_EXTS = ['.vb', '.cs', '.ts', '.js', '.py', '.jsx', '.tsx', '.java', '.go'];

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

function buildClient(provider) {
  const apiKey = provider.apiKeyEnv ? (process.env[provider.apiKeyEnv] || 'no-key') : 'no-key';
  return new OpenAI({ baseURL: provider.baseURL, apiKey });
}

function categorize(project, settings) {
  for (const cat of settings.categories) {
    if (cat.match.some(p => project.toLowerCase().includes(p.toLowerCase()))) return cat.name;
  }
  return settings.defaultCategory || 'generale';
}

function topicFromProject(project) {
  return project.split('-').slice(-2).join('-').toLowerCase()
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

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

function readSourceFiles(filePaths, sourceExts) {
  const result = [], seen = new Set();
  for (const fp of filePaths) {
    if (seen.has(fp) || result.length >= MAX_SOURCE_FILES) break;
    seen.add(fp);
    if (!sourceExts.includes(path.extname(fp).toLowerCase())) continue;
    try {
      const content = fs.readFileSync(fp, 'utf8');
      result.push({ path: fp, content: content.substring(0, MAX_FILE_CHARS) });
    } catch {}
  }
  return result;
}

function isRelevant(projectName, settings) {
  const filters = settings.sessionFilter || [];
  const excludes = settings.excludeFilter || [];
  if (excludes.some(p => projectName.toLowerCase().includes(p.toLowerCase()))) return false;
  if (filters.length === 0) return true;
  return filters.some(p => projectName.toLowerCase().includes(p.toLowerCase()));
}

function buildSessionText(messages) {
  let text = '';
  for (const m of messages) {
    text += (m.role === 'user' ? '>> USER:\n' : '>> ASSISTANT:\n');
    text += (m.content || '').substring(0, 1200) + '\n\n';
    if (text.length > MAX_CHARS) break;
  }
  return text.substring(0, MAX_CHARS);
}

const TEMPLATE_SIGNALS = [
  'src/components/', 'npm run build', 'npm run test', 'React.FC<',
  'jest', 'webpack', 'tree-shaking', 'TypeScript strict',
  'useReducer', 'Context API', 'CSS Modules',
];

function isTemplateContent(markdown) {
  return TEMPLATE_SIGNALS.filter(s => markdown.includes(s)).length >= 3;
}

function extractSections(markdown) {
  const sections = [];
  let heading = null;
  let body = [];
  const flush = () => {
    if (heading !== null) sections.push({ heading, body: body.join('\n').trim() });
  };
  for (const line of markdown.split('\n')) {
    if (/^#{2,3} .+/.test(line)) { flush(); heading = line; body = []; }
    else if (heading !== null) body.push(line);
  }
  flush();
  return sections;
}

function sectionHash({ heading, body }) {
  const normalized = (heading + '\n' + body).toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha1').update(normalized).digest('hex');
}

function writeWikiPage(wikiPath, category, topic, markdown) {
  if (isTemplateContent(markdown)) return;

  const dir  = path.join(wikiPath, category);
  const file = path.join(dir, `${topic}.md`);
  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, 'utf8');
    const existingHashes = new Set(extractSections(existing).map(sectionHash));
    const newSections = extractSections(markdown).filter(s => !existingHashes.has(sectionHash(s)));
    if (newSections.length === 0) return;
    const appendText = newSections.map(s => s.heading + '\n' + s.body).join('\n\n');
    fs.appendFileSync(file, '\n\n---\n\n' + appendText);
    console.log(`📖 wiki updated: ${category}/${topic}.md (+${newSections.length} sezioni)`);
  } else {
    fs.writeFileSync(file, markdown);
    console.log(`📖 wiki created: ${category}/${topic}.md`);
  }
}

export async function wikiIngest(sessionId, projectName) {
  try {
    const settings = loadSettings();
    if (!settings) return;
    if (!isRelevant(projectName, settings)) return;

    const db = new Database(DB_PATH, { readonly: true });
    const messages   = db.prepare('SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT 40').all(sessionId);
    const sessionRow = db.prepare('SELECT file_path FROM sessions WHERE id = ?').get(sessionId);
    db.close();

    if (messages.length < 3) return;

    const sessionText = buildSessionText(messages);
    if (sessionText.length < 100) return;

    // Extract source files touched in this session
    const sourceExts  = settings.sourceExtensions || DEFAULT_SOURCE_EXTS;
    const filePaths   = sessionRow?.file_path ? extractFilesFromJSONL(sessionRow.file_path, sourceExts) : [];
    const sourceFiles = readSourceFiles(filePaths, sourceExts);

    const provider     = settings.provider || { baseURL: 'https://api.deepseek.com', model: 'deepseek-chat', apiKeyEnv: 'DEEPSEEK_API_KEY' };
    const client       = buildClient(provider);
    const model        = provider.model;
    const systemPrompt = settings.systemPrompt || 'Estrai conoscenza tecnica da questa sessione. Rispondi SOLO con una pagina Markdown.';

    let userContent = `Progetto: ${projectName}\n\n`;
    if (sourceFiles.length > 0) {
      userContent += `--- FILE SORGENTE TOCCATI (${sourceFiles.length} file) ---\n`;
      for (const f of sourceFiles) {
        const shortPath = f.path.split(path.sep).slice(-3).join('/');
        userContent += `\n### ${shortPath}\n\`\`\`\n${f.content}\n\`\`\`\n`;
      }
      userContent += '\n';
    }
    userContent += `--- SESSIONE ---\n${sessionText}`;

    const response = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    });

    const markdown = response.choices[0]?.message?.content ?? '';
    if (!markdown.trim() || !markdown.includes('#')) return;

    const category = categorize(projectName, settings);
    const topic    = topicFromProject(projectName);
    writeWikiPage(settings.wikiPath, category, topic, markdown);
  } catch (e) {
    console.warn(`[wiki-ingest] ${projectName}: ${e.message}`);
  }
}
