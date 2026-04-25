import fs from 'fs';
import path from 'path';
import { claudeDirNameToLinuxPath, getClaudeProjectsDirUnc } from './wsl-utils.js';

const SYSTEM_EXCLUDED = [
  '/home/thomas/.claude',
  '/home/thomas/.claude/projects',
];

/**
 * Auto-discovery progetti dalle session dirs in WSL ~/.claude/projects.
 * Decode dirname (es "-home-thomas-Costruzione-Memory") → path Linux.
 */
export function discoverProjects(excludedPaths = []) {
  const claudeProjectsUnc = getClaudeProjectsDirUnc();
  console.log('🔍 Auto-discovery progetti da:', claudeProjectsUnc);

  if (!fs.existsSync(claudeProjectsUnc)) {
    console.log('⚠️  Directory sessioni Claude WSL non trovata');
    return [];
  }

  try {
    const dirs = fs.readdirSync(claudeProjectsUnc, { withFileTypes: true });
    const projects = [];

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const dirPath = path.join(claudeProjectsUnc, dir.name);
      const files = fs.readdirSync(dirPath);
      const hasSession = files.some(f => f.endsWith('.jsonl'));
      if (!hasSession) continue;

      const projectPath = claudeDirNameToLinuxPath(dir.name);
      if (!projectPath) continue;

      if (SYSTEM_EXCLUDED.some(ex => ex === projectPath)) {
        console.log(`  ⏭️  Escluso (sistema): ${projectPath}`);
        continue;
      }

      if (excludedPaths.some(ep => ep === projectPath)) {
        console.log(`  ⏭️  Escluso (utente): ${projectPath}`);
        continue;
      }

      const projectName = path.posix.basename(projectPath);

      projects.push({
        name: projectName,
        path: projectPath,
        claudeDir: dir.name,
        sessionCount: files.filter(f => f.endsWith('.jsonl')).length
      });

      console.log(`  ✅ ${projectName} (${projects[projects.length - 1].sessionCount} sessioni)`);
    }

    console.log(`\n🎉 Trovati ${projects.length} progetti\n`);
    return projects;
  } catch (error) {
    console.error('❌ Errore auto-discovery:', error.message);
    return [];
  }
}

export function isAutoDiscoveryEnabled() {
  return process.env.AUTO_DISCOVERY !== 'false';
}
