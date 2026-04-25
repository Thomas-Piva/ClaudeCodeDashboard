import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, 'config.json');

let cachedConfig = null;
let cachedMtime = 0;

export function loadWslConfig() {
  try {
    const stat = fs.statSync(CONFIG_FILE);
    if (cachedConfig && stat.mtimeMs === cachedMtime) return cachedConfig;
    const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    cachedConfig = {
      wslDistro: raw.wslDistro || 'Ubuntu-24.04',
      wslUser: raw.wslUser || 'thomas',
      projects: raw.projects || []
    };
    cachedMtime = stat.mtimeMs;
    return cachedConfig;
  } catch {
    return { wslDistro: 'Ubuntu-24.04', wslUser: 'thomas', projects: [] };
  }
}

export function linuxPathToClaudeDirName(linuxPath) {
  const base = linuxPath
    .replace(/\//g, '-')
    .replace(/_/g, '-')
    .replace(/\./g, '-')
    .replace(/\s+/g, '-');
  return base.replace(/[^\x00-\x7F]/g, c => '-'.repeat(Buffer.byteLength(c, 'utf8')));
}

export function linuxPathToUnc(linuxPath, distro) {
  const cfg = loadWslConfig();
  const d = distro || cfg.wslDistro;
  return `\\\\wsl.localhost\\${d}${linuxPath.replace(/\//g, '\\')}`;
}

export function claudeDirNameToLinuxPath(dirName) {
  if (!dirName.startsWith('-')) return null;
  return '/' + dirName.slice(1).replace(/-/g, '/');
}

export function getClaudeProjectsDirUnc() {
  const cfg = loadWslConfig();
  return `\\\\wsl.localhost\\${cfg.wslDistro}\\home\\${cfg.wslUser}\\.claude\\projects`;
}

export function getClaudeHomeUnc() {
  const cfg = loadWslConfig();
  return `\\\\wsl.localhost\\${cfg.wslDistro}\\home\\${cfg.wslUser}\\.claude`;
}
