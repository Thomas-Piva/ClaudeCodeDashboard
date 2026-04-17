/**
 * wiki-backfill.js
 * Generates wiki pages from all indexed sessions using wiki-settings.json
 * Run: node --env-file=.env wiki-backfill.js
 */

import Database from 'better-sqlite3';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const DB_PATH      = path.join(import.meta.dirname, 'agentsview.db');
const SETTINGS_FILE = path.join(import.meta.dirname, 'wiki-settings.json');
const MODEL        = 'deepseek-chat';
const MAX_CHARS_PER_SESSION = 8000;
const SESSIONS_PER_TOPIC    = 5;

const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// ── Load settings ──────────────────────────────────────────────────────────
function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
  } catch {
    return {
      wikiPath: process.env.WIKI_PATH || 'C:\\wiki',
      categories: [],
      defaultCategory: 'generale',
      sessionFilter: [],
      excludeFilter: [],
    };
  }
}

// ── Directory structure from settings ─────────────────────────────────────
function ensureWikiDirs(settings) {
  const dirs = settings.categories.map(c => c.name);
  if (settings.defaultCategory) dirs.push(settings.defaultCategory);
  for (const d of dirs) {
    fs.mkdirSync(path.join(settings.wikiPath, d), { recursive: true });
  }
}

// ── Categorize project using settings.categories ──────────────────────────
function categorize(project, settings) {
  for (const cat of settings.categories) {
    if (cat.match.some(pattern => project.toLowerCase().includes(pattern.toLowerCase()))) {
      return cat.name;
    }
  }
  return settings.defaultCategory || 'generale';
}

function topicFromProject(project) {
  const base = project.split('-').slice(-2).join('-').toLowerCase();
  return base.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ── DB query — built dynamically from settings.sessionFilter ──────────────
function getSessions(settings) {
  const db = new Database(DB_PATH, { readonly: true });

  const includePatterns = settings.sessionFilter || [];
  const excludePatterns = settings.excludeFilter || [];

  const includeClauses = includePatterns.map(() => `s.project LIKE ?`).join('\n      OR ');
  const excludeClauses = excludePatterns.map(() => `s.project NOT LIKE ?`).join('\n    AND ');

  const whereInclude = includeClauses ? `(${includeClauses})` : '1=1';
  const whereExclude = excludeClauses ? `AND ${excludeClauses}` : '';

  const sql = `
    SELECT DISTINCT s.id, s.project, s.updated_at
    FROM sessions s
    WHERE ${whereInclude}
    ${whereExclude}
    ORDER BY s.project, s.updated_at DESC
  `;

  const includeArgs = includePatterns.map(p => `%${p}%`);
  const excludeArgs = excludePatterns.map(p => `%${p}%`);

  const sessions = db.prepare(sql).all(...includeArgs, ...excludeArgs);
  db.close();
  return sessions;
}

function getSessionMessages(sessionId) {
  const db = new Database(DB_PATH, { readonly: true });
  const msgs = db.prepare(
    `SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC`
  ).all(sessionId);
  db.close();
  return msgs;
}

// ── Build session text ─────────────────────────────────────────────────────
function buildSessionText(messages) {
  let text = '';
  for (const m of messages) {
    const prefix = m.role === 'user' ? '>> USER:\n' : '>> ASSISTANT:\n';
    text += prefix + (m.content || '').substring(0, 1500) + '\n\n';
    if (text.length > MAX_CHARS_PER_SESSION) break;
  }
  return text.substring(0, MAX_CHARS_PER_SESSION);
}

// ── System prompt ──────────────────────────────────────────────────────────
function buildSystemPrompt(settings) {
  const categoryList = settings.categories
    .map(c => `- **${c.name}** (${c.label}): progetti che contengono ${c.match.join(', ')}`)
    .join('\n');

  return `Sei un agente di estrazione della conoscenza tecnica.
Analizza sessioni di lavoro con Claude Code ed estrai informazioni utili per sviluppatori.

Rispondi SOLO con una pagina Markdown (niente JSON, niente spiegazioni).

Formato obbligatorio — inizia SEMPRE con:
# <Titolo Leggibile del Modulo o Progetto>

**Correlati:** [[link-correlato]] | [[altro-link]]

Poi usa:
- ## per sezioni principali, ### per sottosezioni
- Tabelle Markdown per strutture DB o configurazioni
- Blocchi di codice con linguaggio specificato (\`\`\`sql, \`\`\`vb, \`\`\`ts, ecc.)
- [[link]] per riferimenti a altri moduli/pagine della wiki

Estrai (se presenti nelle sessioni):
1. Cosa fa il modulo/progetto (2-3 righe)
2. Strutture dati: tabelle DB, API, configurazioni chiave
3. Business logic: regole, condizioni, workflow
4. Pattern codice ricorrenti o degni di nota
5. Decisioni architetturali, workaround, gotcha

Categorie wiki configurate:
${categoryList}

Se le sessioni non contengono informazioni tecniche utili, rispondi con una pagina minimale.`;
}

// ── Call DeepSeek API ──────────────────────────────────────────────────────
async function extractKnowledge(project, sessionTexts, systemPrompt) {
  const userContent = `Progetto: ${project}\n\n` +
    sessionTexts.map((t, i) => `--- SESSIONE ${i + 1} ---\n${t}`).join('\n\n');

  const response = await client.chat.completions.create({
    model: MODEL,
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

// ── Write / merge wiki page ────────────────────────────────────────────────
function writeWikiPage(wikiPath, category, topic, markdown) {
  const dir  = path.join(wikiPath, category);
  const file = path.join(dir, `${topic}.md`);

  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, 'utf8');
    const newHeadings = (markdown.match(/^#{2,3} .+/gm) || [])
      .filter(h => !existing.includes(h));
    if (newHeadings.length === 0) {
      console.log(`  ↔ unchanged: ${topic}.md`);
      return;
    }
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
  const settings = loadSettings();

  console.log('Wiki Backfill');
  console.log('=============');
  console.log(`DB:         ${DB_PATH}`);
  console.log(`Wiki:       ${settings.wikiPath}`);
  console.log(`Model:      ${MODEL}`);
  console.log(`Categories: ${settings.categories.map(c => c.name).join(', ')}`);
  console.log(`Filter:     ${settings.sessionFilter.join(', ')}\n`);

  ensureWikiDirs(settings);

  const sessions = getSessions(settings);
  console.log(`Found ${sessions.length} sessions\n`);

  const byProject = groupByProject(sessions);
  console.log(`Projects: ${byProject.size}\n`);

  const systemPrompt = buildSystemPrompt(settings);

  let processed = 0;
  let errors    = 0;

  for (const [project, projectSessions] of byProject) {
    const category = categorize(project, settings);
    const topic    = topicFromProject(project);
    console.log(`[${category}] ${project} (${projectSessions.length} sessions)`);

    const toProcess   = projectSessions.slice(0, SESSIONS_PER_TOPIC);
    const sessionTexts = toProcess
      .map(s => buildSessionText(getSessionMessages(s.id)))
      .filter(t => t.length > 100);

    if (sessionTexts.length === 0) {
      console.log('  ⊘ no usable content, skip');
      continue;
    }

    try {
      const markdown = await extractKnowledge(project, sessionTexts, systemPrompt);
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

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
