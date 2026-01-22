import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProjectWatcher } from './watcher.js';
import { ClaudeSessionWatcher } from './claude-watcher.js';
import { discoverProjects, isAutoDiscoveryEnabled } from './auto-discovery.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione
const PORT = 3001;
const WS_PORT = 3001;
const USE_REAL_SESSIONS = process.env.USE_REAL_SESSIONS !== 'false'; // default true
const AUTO_DISCOVERY = isAutoDiscoveryEnabled();

// Leggi configurazione progetti
let config;

if (AUTO_DISCOVERY) {
  console.log('🔍 Modalità AUTO-DISCOVERY attiva\n');
  const discoveredProjects = discoverProjects();

  // Carica anche config.json se esiste per progetti aggiuntivi
  try {
    const configPath = path.join(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    const manualConfig = JSON.parse(configData);

    // Unisci progetti scoperti con quelli manuali (rimuovi duplicati)
    const manualProjectPaths = manualConfig.projects.map(p => p.path);
    const uniqueDiscovered = discoveredProjects.filter(
      p => !manualProjectPaths.includes(p.path)
    );

    config = {
      projects: [...manualConfig.projects, ...uniqueDiscovered]
    };

    console.log(`📋 Caricati ${manualConfig.projects.length} progetti da config.json`);
    console.log(`🔍 Scoperti ${uniqueDiscovered.length} nuovi progetti automaticamente`);
    console.log(`📊 Totale: ${config.projects.length} progetti\n`);
  } catch (error) {
    // Se config.json non esiste, usa solo progetti scoperti
    config = { projects: discoveredProjects };
    console.log(`📊 Totale: ${config.projects.length} progetti (solo auto-discovery)\n`);
  }
} else {
  try {
    const configPath = path.join(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configData);
    console.log(`📋 Caricati ${config.projects.length} progetti da config.json\n`);
  } catch (error) {
    console.error('❌ Errore lettura config.json:', error.message);
    console.error('💡 Suggerimento: abilita AUTO_DISCOVERY=true per scoperta automatica');
    process.exit(1);
  }
}

// Setup Express
const app = express();
app.use(cors());
app.use(express.json());

// HTTP Server
const server = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });

// Lista client connessi
const clients = new Set();

// Gestione connessioni WebSocket
wss.on('connection', (ws) => {
  console.log('🔌 Nuovo client connesso');
  clients.add(ws);

  // Invia configurazione progetti al client
  ws.send(JSON.stringify({
    type: 'config',
    projects: config.projects.map(p => ({
      name: p.name,
      path: p.path
    }))
  }));

  // Invia stato corrente di tutti i progetti
  if (projectWatcher) {
    if (USE_REAL_SESSIONS) {
      // Con ClaudeSessionWatcher, lo stato viene inviato automaticamente all'avvio
      console.log('📤 Stato iniziale sarà inviato automaticamente');
    } else {
      config.projects.forEach(project => {
        const statusPath = path.join(project.path, '.claude', 'status.json');
        if (fs.existsSync(statusPath)) {
          projectWatcher.readAndBroadcast(project, statusPath);
        }
      });
    }
  }

  ws.on('close', () => {
    console.log('🔌 Client disconnesso');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ Errore WebSocket:', error.message);
    clients.delete(ws);
  });
});

// Funzione per broadcast a tutti i client
function broadcastToClients(data) {
  const message = JSON.stringify({
    type: 'status',
    data
  });

  clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// Inizializza watcher
let projectWatcher;
if (USE_REAL_SESSIONS) {
  console.log('🔍 Modalità: Monitoraggio sessioni Claude Code REALI\n');
  projectWatcher = new ClaudeSessionWatcher(config.projects, broadcastToClients);
} else {
  console.log('📝 Modalità: Monitoraggio file status.json\n');
  projectWatcher = new ProjectWatcher(config.projects, broadcastToClients);
}
projectWatcher.start();

// API REST (opzionali)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', projects: config.projects.length });
});

app.get('/api/projects', (req, res) => {
  res.json(config.projects);
});

// Endpoint per segnare progetto come controllato
app.post('/api/projects/:projectName/mark-checked', (req, res) => {
  const { projectName } = req.params;

  // Verifica che il progetto esista
  const project = config.projects.find(p => p.name === projectName);
  if (!project) {
    return res.status(404).json({ error: 'Progetto non trovato' });
  }

  // Segna come controllato (solo per ClaudeSessionWatcher)
  if (projectWatcher && typeof projectWatcher.markAsChecked === 'function') {
    projectWatcher.markAsChecked(projectName);
    res.json({ success: true, projectName, message: 'Progetto segnato come controllato' });
  } else {
    res.status(400).json({ error: 'Funzionalità non disponibile con questo watcher' });
  }
});

// Avvia server
server.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Dashboard Claude Code Backend');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${WS_PORT}`);
  console.log(`📊 Progetti monitorati: ${config.projects.length}`);
  console.log(`🔍 Modalità: ${USE_REAL_SESSIONS ? 'Sessioni REALI' : 'File status.json'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Gestione shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Arresto server...');
  projectWatcher.stop();
  server.close(() => {
    console.log('✅ Server arrestato');
    process.exit(0);
  });
});
