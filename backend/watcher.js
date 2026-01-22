import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';

export class ProjectWatcher {
  constructor(projects, onUpdate) {
    this.projects = projects;
    this.onUpdate = onUpdate;
    this.watchers = [];
    this.statusCache = new Map();
  }

  start() {
    console.log('🚀 Avvio monitoraggio progetti...\n');

    this.projects.forEach((project) => {
      const statusPath = path.join(project.path, '.claude', 'status.json');
      const statusDir = path.dirname(statusPath);

      // Crea directory .claude se non esiste
      if (!fs.existsSync(statusDir)) {
        try {
          fs.mkdirSync(statusDir, { recursive: true });
          console.log(`📁 Creata directory: ${statusDir}`);
        } catch (error) {
          console.error(`❌ Errore creazione directory ${statusDir}:`, error.message);
          return;
        }
      }

      // Crea status.json fake se non esiste (per testing)
      if (!fs.existsSync(statusPath)) {
        const initialStatus = {
          status: 'idle',
          lastUpdate: new Date().toISOString(),
          lastOutput: 'Nessuna attività rilevata',
          project: project.name
        };
        try {
          fs.writeFileSync(statusPath, JSON.stringify(initialStatus, null, 2));
          console.log(`✅ Creato status.json per: ${project.name}`);
        } catch (error) {
          console.error(`❌ Errore creazione status.json per ${project.name}:`, error.message);
        }
      }

      // Leggi stato iniziale
      this.readAndBroadcast(project, statusPath);

      // Monitora il file status.json
      const watcher = chokidar.watch(statusPath, {
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      });

      watcher
        .on('change', () => {
          console.log(`🔄 Modificato: ${project.name}`);
          this.readAndBroadcast(project, statusPath);
        })
        .on('add', () => {
          console.log(`➕ Aggiunto: ${project.name}`);
          this.readAndBroadcast(project, statusPath);
        })
        .on('error', (error) => {
          console.error(`❌ Errore watcher ${project.name}:`, error.message);
          this.broadcastError(project, error.message);
        });

      this.watchers.push(watcher);
      console.log(`👀 Monitoraggio attivo: ${project.name} → ${statusPath}`);
    });

    console.log(`\n✅ Monitoraggio attivo su ${this.projects.length} progetti\n`);
  }

  readAndBroadcast(project, statusPath) {
    try {
      const data = fs.readFileSync(statusPath, 'utf-8');
      const status = JSON.parse(data);

      // Arricchisci con info progetto
      const enrichedStatus = {
        ...status,
        projectName: project.name,
        projectPath: project.path,
        timestamp: new Date().toISOString()
      };

      // Cache per evitare broadcast duplicati
      const cacheKey = `${project.name}-${JSON.stringify(status)}`;
      if (this.statusCache.get(project.name) !== cacheKey) {
        this.statusCache.set(project.name, cacheKey);
        this.onUpdate(enrichedStatus);
      }
    } catch (error) {
      console.error(`❌ Errore lettura ${project.name}:`, error.message);
      this.broadcastError(project, error.message);
    }
  }

  broadcastError(project, errorMessage) {
    const errorStatus = {
      status: 'error',
      lastUpdate: new Date().toISOString(),
      lastOutput: `Errore: ${errorMessage}`,
      projectName: project.name,
      projectPath: project.path,
      timestamp: new Date().toISOString()
    };
    this.onUpdate(errorStatus);
  }

  stop() {
    console.log('🛑 Arresto watcher...');
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers = [];
    this.statusCache.clear();
  }
}
