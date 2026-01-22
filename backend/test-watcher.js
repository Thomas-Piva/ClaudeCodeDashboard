import { ClaudeSessionWatcher } from './claude-watcher.js';

// Test con il progetto corrente
const testProjects = [
  {
    name: "DashboardClaudeCode",
    path: "C:\\Progetti Pilota\\DashboardClaudeCode"
  }
];

function onUpdate(data) {
  console.log('\n📊 AGGIORNAMENTO RICEVUTO:');
  console.log(JSON.stringify(data, null, 2));
}

console.log('🧪 Test ClaudeSessionWatcher\n');

const watcher = new ClaudeSessionWatcher(testProjects, onUpdate);
watcher.start();

console.log('\n✅ Watcher avviato - premi Ctrl+C per terminare');

process.on('SIGINT', () => {
  console.log('\n\n🛑 Arresto test...');
  watcher.stop();
  process.exit(0);
});
