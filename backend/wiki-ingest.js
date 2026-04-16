/**
 * wiki-ingest.js
 * Incremental wiki update — called after indexSession() for NTS-related projects.
 * Processes a single session and updates C:\EGM-Wiki.
 */

import Anthropic from '@anthropic-ai/sdk';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH   = path.join(import.meta.dirname, 'agentsview.db');
const WIKI_PATH = 'C:\\EGM-Wiki';
const MODEL     = 'claude-haiku-4-5';

const NTS_PROJECTS = /BIZ2017|BUSEXP|GestionaleApi|ControlloPad|EsploraPreventivi|AgenteVendite|ProgettiEgm/i;
const NTS_CONTENT  = /business-erp|mcp__business|cerca_articoli|cerca_clienti|crea_offerta|NTS Informatica/i;

const client = new Anthropic();

function categorize(project) {
  if (/BIZ2017|BUSEXP/i.test(project)) return 'nts-gestionale';
  if (/ProgettiEgm/i.test(project))    return 'egm-projects';
  if (/ProgettiPilota/i.test(project)) return 'egm-pilots';
  return 'nts-gestionale';
}

function topicFromProject(project) {
  return project.split('-').slice(-2).join('-').toLowerCase()
    .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function isNTSRelevant(projectName, messages) {
  if (NTS_PROJECTS.test(projectName)) return true;
  return messages.some(m => NTS_CONTENT.test(m.content));
}

export async function wikiIngest(sessionId, projectName) {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const messages = db.prepare(
      'SELECT role, content FROM messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT 40'
    ).all(sessionId);
    db.close();

    if (!isNTSRelevant(projectName, messages)) return;
    if (messages.length < 3) return;

    const category = categorize(projectName);
    const topic    = topicFromProject(projectName);

    let sessionText = '';
    for (const m of messages) {
      sessionText += (m.role === 'user' ? '>> USER:\n' : '>> ASSISTANT:\n');
      sessionText += m.content.substring(0, 1200) + '\n\n';
      if (sessionText.length > 6000) break;
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: `Estrai conoscenza tecnica su NTS Business ERP da questa sessione di lavoro.
Rispondi SOLO con JSON: {"topic":"string","category":"string","title":"string","sections":[{"heading":"## ...","content":"markdown"}],"related":["[[link]]"]}`,
      messages: [
        {
          role: 'user',
          content: `Progetto: ${projectName}\n\n${sessionText}`,
        },
      ],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '';
    const jsonMatch = text.match(/```json\s*([\s\S]+?)\s*```/) || text.match(/(\{[\s\S]+\})/);
    if (!jsonMatch) return;

    const extracted = JSON.parse(jsonMatch[1]);
    if (!extracted.sections?.length) return;

    extracted.category = extracted.category || category;
    extracted.topic    = extracted.topic    || topic;

    const dir  = path.join(WIKI_PATH, extracted.category);
    const file = path.join(dir, `${extracted.topic}.md`);
    fs.mkdirSync(dir, { recursive: true });

    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, 'utf8');
      const newSections = extracted.sections.filter(s => !existing.includes(s.heading));
      if (newSections.length > 0) {
        const appendContent = '\n---\n' +
          newSections.map(s => `${s.heading}\n\n${s.content}`).join('\n\n');
        fs.appendFileSync(file, appendContent);
      }
    } else {
      let content = `# ${extracted.title}\n\n`;
      if (extracted.related?.length) content += `**Correlati:** ${extracted.related.join(' | ')}\n\n`;
      for (const s of extracted.sections) content += `${s.heading}\n\n${s.content}\n\n`;
      fs.writeFileSync(file, content);
    }
  } catch {
    // silent — wiki update is best-effort, never block indexing
  }
}
