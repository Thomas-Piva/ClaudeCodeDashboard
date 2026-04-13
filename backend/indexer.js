import fs from 'fs';
import { upsertSession, clearMessages, insertMessage, sessionIdFromPath } from './db.js';

/**
 * Parse Claude Code JSONL file and index into SQLite.
 * Idempotent: safe to call multiple times on the same file.
 *
 * @param {string} filePath  Absolute path to .jsonl file
 * @param {string} projectName  Project name string
 */
export function indexSession(filePath, projectName) {
  try {
    if (!fs.existsSync(filePath)) return;

    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim());
    if (lines.length === 0) return;

    const sessionId = sessionIdFromPath(filePath);
    const messages = [];
    const toolCountMap = {};
    let startedAt = null;
    let updatedAt = null;

    for (const line of lines) {
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }

      // Skip system entries
      if (entry.type === 'system') continue;

      // Determine role
      const role = entry.type === 'assistant' ? 'assistant' : 'user';

      // Parse timestamp
      const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : null;
      if (ts) {
        if (!startedAt || ts < startedAt) startedAt = ts;
        if (!updatedAt || ts > updatedAt) updatedAt = ts;
      }

      // Extract text content and tool calls
      const content = entry.message?.content;
      const toolsUsed = [];
      let textParts = [];

      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            textParts.push(block.text);
          } else if (block.type === 'tool_use' && block.name) {
            toolsUsed.push(block.name);
            toolCountMap[block.name] = (toolCountMap[block.name] || 0) + 1;
          } else if (block.type === 'tool_result') {
            // tool results: extract text content if present
            const inner = block.content;
            if (typeof inner === 'string') textParts.push(inner);
            else if (Array.isArray(inner)) {
              for (const b of inner) {
                if (b.type === 'text' && b.text) textParts.push(b.text);
              }
            }
          }
        }
      } else if (typeof content === 'string') {
        textParts.push(content);
      }

      // Also handle thinking blocks (assistant only)
      if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'thinking' && block.thinking) {
            textParts.push(block.thinking);
          }
        }
      }

      const text = textParts.join('\n').trim();
      if (!text && toolsUsed.length === 0) continue;

      messages.push({
        session_id: sessionId,
        role,
        content: text || `[${toolsUsed.join(', ')}]`,
        timestamp: ts,
        tools_used: JSON.stringify(toolsUsed)
      });
    }

    const toolCalls = Object.entries(toolCountMap).map(([name, count]) => ({ name, count }));

    // Upsert session
    upsertSession({
      id: sessionId,
      project: projectName,
      file_path: filePath,
      started_at: startedAt,
      updated_at: updatedAt || Date.now(),
      message_count: messages.length,
      tool_calls: JSON.stringify(toolCalls)
    });

    // Replace all messages (idempotent re-index)
    clearMessages(sessionId);
    for (const msg of messages) {
      insertMessage(msg);
    }

    console.log(`📚 Indexed: ${projectName} — ${messages.length} messages`);
  } catch (err) {
    console.error(`❌ indexSession error (${filePath}): ${err.message}`);
  }
}
