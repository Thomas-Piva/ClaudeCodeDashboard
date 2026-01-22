import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leggi configurazione
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const statuses = ['active', 'idle', 'error'];
const outputs = [
  'Building component...',
  'Running tests...',
  'Compiling TypeScript...',
  'Installing dependencies...',
  'Git commit in progress...',
  'Refactoring code...',
  'Writing documentation...',
  'Error: File not found',
  'Error: Compilation failed',
  'Waiting for user input...',
  'Idle - No activity',
  'Code analysis complete',
  'Deploying to production...'
];

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function updateProjectStatus(project) {
  const statusPath = path.join(project.path, '.claude', 'status.json');
  const statusDir = path.dirname(statusPath);

  // Crea directory se non esiste
  if (!fs.existsSync(statusDir)) {
    fs.mkdirSync(statusDir, { recursive: true });
  }

  const status = {
    status: getRandomElement(statuses),
    lastUpdate: new Date().toISOString(),
    lastOutput: getRandomElement(outputs),
    project: project.name
  };

  try {
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    console.log(`✅ ${project.name}: ${status.status} - "${status.lastOutput}"`);
  } catch (error) {
    console.error(`❌ Errore aggiornamento ${project.name}:`, error.message);
  }
}

function simulateActivity() {
  console.clear();
  console.log('🎭 SIMULATORE ATTIVITA\' CLAUDE CODE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Aggiorna tutti i progetti
  config.projects.forEach(updateProjectStatus);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Prossimo aggiornamento tra 5 secondi...');
  console.log('Premi Ctrl+C per terminare\n');
}

// Avvia simulazione
console.log('🚀 Avvio simulatore...\n');
simulateActivity();

// Aggiorna ogni 5 secondi
const interval = setInterval(simulateActivity, 5000);

// Gestione shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arresto simulatore...');
  clearInterval(interval);
  process.exit(0);
});
