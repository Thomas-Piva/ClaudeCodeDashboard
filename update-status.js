#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Uso: node update-status.js <status> <message>');
  console.log('Esempio: node update-status.js active "Coding in progress"');
  console.log('\nStatus validi: active, idle, error');
  process.exit(1);
}

const [status, lastOutput] = args;

if (!['active', 'idle', 'error'].includes(status)) {
  console.error('❌ Status invalido. Usa: active, idle, error');
  process.exit(1);
}

const statusPath = path.join(process.cwd(), '.claude', 'status.json');
const statusDir = path.dirname(statusPath);

// Crea directory se non esiste
if (!fs.existsSync(statusDir)) {
  fs.mkdirSync(statusDir, { recursive: true });
}

const projectName = path.basename(process.cwd());

const statusData = {
  status,
  lastUpdate: new Date().toISOString(),
  lastOutput,
  project: projectName
};

try {
  fs.writeFileSync(statusPath, JSON.stringify(statusData, null, 2));
  console.log(`✅ Status aggiornato: ${status} - "${lastOutput}"`);
} catch (error) {
  console.error('❌ Errore:', error.message);
  process.exit(1);
}
