import { ClaudeSessionWatcher } from './claude-watcher.js';

// Test con un progetto WSL Linux
const testProjects = [
  {
    name: "Costruzione_Memory",
    path: "/home/thomas/Costruzione_Memory"
  }
];

function onUpdate(data) {
  console.log('\n📊 AGGIORNAMENTO RICEVUTO:');
  console.log(JSON.stringify(data, null, 2));
}

console.log('🧪 Test ClaudeSessionWatcher (WSL hybrid)\n');

const watcher = new ClaudeSessionWatcher(testProjects, onUpdate);
watcher.start();

console.log('\n✅ Watcher avviato - premi Ctrl+C per terminare');

process.on('SIGINT', () => {
  console.log('\n\n🛑 Arresto test...');
  watcher.stop();
  process.exit(0);
});
