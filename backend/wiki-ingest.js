/**
 * wiki-ingest.js
 * Incremental wiki update — called after indexSession().
 * Uses the same provider/settings as wiki-backfill.js.
 */

import OpenAI from 'openai';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH       = path.join(import.meta.dirname, 'agentsview.db');
const SETTINGS_FILE = path.join(import.meta.dirname, 'wiki-settings.json');
const MAX_CHARS     = 6000;

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

function normalizeHeading(h) {
  return h.replace(/^#+\s*/, '').toLowerCase().trim();
}

function writeWikiPage(wikiPath, category, topic, markdown) {
  if (isTemplateContent(markdown)) return;

  const dir  = path.join(wikiPath, category);
  const file = path.join(dir, `${topic}.md`);
  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, 'utf8');
    const existingNorm = new Set(
      (existing.match(/^#{2,3} .+/gm) || []).map(normalizeHeading)
    );
    const newHeadings = (markdown.match(/^#{2,3} .+/gm) || [])
      .filter(h => !existingNorm.has(normalizeHeading(h)));
    if (newHeadings.length === 0) return;
    const newSections = newHeadings.map(h => {
      const idx  = markdown.indexOf(h);
      const next = markdown.indexOf('\n## ', idx + 1);
      return markdown.slice(idx, next === -1 ? undefined : next).trim();
    }).join('\n\n');
    fs.appendFileSync(file, '\n\n---\n\n' + newSections);
    console.log(`📖 wiki updated: ${category}/${topic}.md`);
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
    const messages = db.prepare(
      'SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT 40'
    ).all(sessionId);
    db.close();

    if (messages.length < 3) return;

    const sessionText = buildSessionText(messages);
    if (sessionText.length < 100) return;

    const provider = settings.provider || { baseURL: 'https://api.deepseek.com', model: 'deepseek-chat', apiKeyEnv: 'DEEPSEEK_API_KEY' };
    const client   = buildClient(provider);
    const model    = provider.model;

    const systemPrompt = settings.systemPrompt || 'Estrai conoscenza tecnica da questa sessione. Rispondi SOLO con una pagina Markdown.';

    const response = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Progetto: ${projectName}\n\n--- SESSIONE ---\n${sessionText}` },
      ],
    });

    const markdown = response.choices[0]?.message?.content ?? '';
    if (!markdown.trim() || !markdown.includes('#')) return;

    const category = categorize(projectName, settings);
    const topic    = topicFromProject(projectName);
    writeWikiPage(settings.wikiPath, category, topic, markdown);
  } catch {
    // best-effort — never block indexing
  }
}
