/**
 * wiki-backfill.js
 * Processes NTS-related sessions from agentsview.db → generates wiki pages in C:\EGM-Wiki
 * Run: node wiki-backfill.js
 */

import Database from 'better-sqlite3';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(import.meta.dirname, 'agentsview.db');
const WIKI_PATH = process.env.WIKI_PATH || 'C:\\EGM-Wiki';
const MODEL   = 'deepseek-chat'; // DeepSeek V3 — ~10x cheaper than Haiku
const MAX_TOKENS_PER_SESSION = 8000; // chars limit before truncating messages
const SESSIONS_PER_TOPIC     = 5;    // how many sessions to batch per topic call

const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// ── Directory structure ────────────────────────────────────────────────────
const WIKI_DIRS = [
  'nts-gestionale',
  'egm-projects',
  'egm-pilots',
  'mcp-tools',
];

function ensureWikiDirs() {
  for (const d of WIKI_DIRS) {
    fs.mkdirSync(path.join(WIKI_PATH, d), { recursive: true });
  }
}

// ── Project categorization ─────────────────────────────────────────────────
function categorize(project) {
  if (/BIZ2017|BUSEXP/i.test(project))    return 'nts-gestionale';
  if (/ProgettiEgm/i.test(project))       return 'egm-projects';
  if (/ProgettiPilota/i.test(project))    return 'egm-pilots';
  return 'nts-gestionale'; // default for NTS sessions
}

function topicFromProject(project) {
  const base = project.split('-').slice(-2).join('-').toLowerCase();
  return base.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ── DB queries ─────────────────────────────────────────────────────────────
function getNTSSessions() {
  const db = new Database(DB_PATH, { readonly: true });
  const sessions = db.prepare(`
    SELECT DISTINCT s.id, s.project, s.updated_at
    FROM sessions s
    JOIN messages m ON m.session_id = s.id
    WHERE (
      m.content LIKE '%NTS Informatica%'
      OR m.content LIKE '%business-erp%'
      OR m.content LIKE '%mcp__business%'
      OR m.content LIKE '%gestionale Business%'
      OR m.content LIKE '%cerca_articoli%'
      OR m.content LIKE '%cerca_clienti%'
      OR m.content LIKE '%cerca_offerte%'
      OR m.content LIKE '%apri_offerta%'
      OR m.content LIKE '%crea_offerta%'
      OR s.project LIKE '%BIZ2017%'
      OR s.project LIKE '%BUSEXP%'
      OR s.project LIKE '%GestionaleApi%'
      OR s.project LIKE '%ControlloPadOrdini%'
      OR s.project LIKE '%EsploraPreventivi%'
      OR s.project LIKE '%AgenteVendite%'
      OR s.project LIKE '%ProgettiEgm%'
    )
    AND s.project NOT LIKE '%observer%'
    AND s.project NOT LIKE '%DashboardClaudeCode%'
    ORDER BY s.project, s.updated_at DESC
  `).all();
  db.close();
  return sessions;
}

function getSessionMessages(sessionId) {
  const db = new Database(DB_PATH, { readonly: true });
  const msgs = db.prepare(`
    SELECT role, content FROM messages
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `).all(sessionId);
  db.close();
  return msgs;
}

// ── Build session text (truncated) ─────────────────────────────────────────
function buildSessionText(messages) {
  let text = '';
  for (const m of messages) {
    const prefix = m.role === 'user' ? '>> USER:\n' : '>> ASSISTANT:\n';
    const content = m.content.substring(0, 1500); // limit per message
    text += prefix + content + '\n\n';
    if (text.length > MAX_TOKENS_PER_SESSION) break;
  }
  return text.substring(0, MAX_TOKENS_PER_SESSION);
}

// ── System prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Sei un agente di estrazione della conoscenza per EGM Sistemi.
Analizza sessioni di lavoro con Claude Code relative al gestionale Business di NTS Informatica.

Rispondi SOLO con una pagina Markdown (niente JSON, niente spiegazioni).

Formato obbligatorio — inizia SEMPRE con queste due righe:
# <Titolo Leggibile del Modulo>

**Correlati:** [[architettura-biz2017]] | [[ui-patterns]]

Poi usa:
- ## per sezioni principali
- ### per sottosezioni
- Tabelle Markdown per strutture DB
- Blocchi \`\`\`vb o \`\`\`sql per codice
- [[link]] per riferimenti a altri moduli

Estrai (se presenti nelle sessioni):
1. Cosa fa il modulo (2-3 righe)
2. Tabelle DB: nomi, colonne chiave, significato
3. Business logic: regole, condizioni, workflow
4. Pattern codice VB.NET ricorrenti
5. Decisioni architetturali, workaround, gotcha

Se le sessioni non contengono informazioni tecniche utili, rispondi con una pagina minimale.`;

// ── Call DeepSeek API — returns raw Markdown ──────────────────────────────
async function extractKnowledge(project, sessionTexts) {
  const userContent = `Progetto: ${project}\n\n` +
    sessionTexts.map((t, i) => `--- SESSIONE ${i + 1} ---\n${t}`).join('\n\n');

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userContent },
    ],
  });

  const markdown = response.choices[0]?.message?.content ?? '';
  if (!markdown.trim()) throw new Error('Empty response');
  return markdown;
}

// ── Write / merge wiki page ────────────────────────────────────────────────
function writeWikiPage(category, topic, markdown) {
  const dir  = path.join(WIKI_PATH, category);
  const file = path.join(dir, `${topic}.md`);

  if (fs.existsSync(file)) {
    // Extract headings already present to avoid duplication
    const existing = fs.readFileSync(file, 'utf8');
    const newHeadings = (markdown.match(/^#{2,3} .+/gm) || [])
      .filter(h => !existing.includes(h));
    if (newHeadings.length === 0) {
      console.log(`  ↔ unchanged: ${topic}.md`);
      return;
    }
    // Append only new sections
    const newSections = newHeadings.map(h => {
      const idx = markdown.indexOf(h);
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
  console.log('EGM Wiki Backfill');
  console.log('=================');
  console.log(`DB: ${DB_PATH}`);
  console.log(`Wiki: ${WIKI_PATH}`);
  console.log(`Model: ${MODEL}\n`);

  ensureWikiDirs();

  const sessions = getNTSSessions();
  console.log(`Found ${sessions.length} NTS sessions\n`);

  const byProject = groupByProject(sessions);
  console.log(`Projects: ${byProject.size}\n`);

  let processed = 0;
  let errors    = 0;

  for (const [project, projectSessions] of byProject) {
    const category = categorize(project);
    const topic    = topicFromProject(project);
    console.log(`[${category}] ${project} (${projectSessions.length} sessions)`);

    // Take max SESSIONS_PER_TOPIC most recent sessions
    const toProcess = projectSessions.slice(0, SESSIONS_PER_TOPIC);
    const sessionTexts = toProcess.map(s => {
      const msgs = getSessionMessages(s.id);
      return buildSessionText(msgs);
    }).filter(t => t.length > 100);

    if (sessionTexts.length === 0) {
      console.log('  ⊘ no usable content, skip');
      continue;
    }

    try {
      const markdown = await extractKnowledge(project, sessionTexts);
      writeWikiPage(category, topic, markdown);
      processed++;
    } catch (err) {
      console.error(`  ✗ error: ${err.message}`);
      errors++;
    }

    // Small delay to respect rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✓ Done. Processed: ${processed}, Errors: ${errors}`);
  console.log(`Wiki at: ${WIKI_PATH}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
