import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'agentsview.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      file_path TEXT NOT NULL,
      started_at INTEGER,
      updated_at INTEGER,
      message_count INTEGER DEFAULT 0,
      tool_calls TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER,
      tools_used TEXT DEFAULT '[]'
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      session_id UNINDEXED,
      role,
      content,
      timestamp UNINDEXED,
      tools_used UNINDEXED,
      content=messages,
      content_rowid=id,
      tokenize='porter unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, session_id, role, content, timestamp, tools_used)
        VALUES (new.id, new.session_id, new.role, new.content, new.timestamp, new.tools_used);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, session_id, role, content, timestamp, tools_used)
        VALUES ('delete', old.id, old.session_id, old.role, old.content, old.timestamp, old.tools_used);
      INSERT INTO messages_fts(rowid, session_id, role, content, timestamp, tools_used)
        VALUES (new.id, new.session_id, new.role, new.content, new.timestamp, new.tools_used);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, session_id, role, content, timestamp, tools_used)
        VALUES ('delete', old.id, old.session_id, old.role, old.content, old.timestamp, old.tools_used);
    END;

    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project);
  `);
}

export function sessionIdFromPath(filePath) {
  return crypto.createHash('sha1').update(filePath).digest('hex');
}

// Upsert session row. Overwrites all fields.
export function upsertSession(session) {
  const db = getDb();
  db.prepare(`
    INSERT INTO sessions (id, project, file_path, started_at, updated_at, message_count, tool_calls)
    VALUES (@id, @project, @file_path, @started_at, @updated_at, @message_count, @tool_calls)
    ON CONFLICT(id) DO UPDATE SET
      project = excluded.project,
      file_path = excluded.file_path,
      started_at = excluded.started_at,
      updated_at = excluded.updated_at,
      message_count = excluded.message_count,
      tool_calls = excluded.tool_calls
  `).run(session);
}

// Delete all messages for a session (used before re-indexing).
export function clearMessages(sessionId) {
  getDb().prepare('DELETE FROM messages WHERE session_id = ?').run(sessionId);
}

// Insert a single message row. FTS triggers handle FTS table.
export function insertMessage(msg) {
  getDb().prepare(`
    INSERT INTO messages (session_id, role, content, timestamp, tools_used)
    VALUES (@session_id, @role, @content, @timestamp, @tools_used)
  `).run(msg);
}

// List sessions, optional project filter, newest first.
export function listSessions({ project, limit = 20, offset = 0 } = {}) {
  const db = getDb();
  if (project) {
    return db.prepare(`
      SELECT * FROM sessions WHERE project = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?
    `).all(project, limit, offset);
  }
  return db.prepare(`
    SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
}

// Get single session by id.
export function getSession(id) {
  return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id);
}

// Get paginated messages for a session.
export function getMessages(sessionId, { limit = 50, offset = 0 } = {}) {
  return getDb().prepare(`
    SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC, id ASC LIMIT ? OFFSET ?
  `).all(sessionId, limit, offset);
}

// Full-text search. Returns up to `limit` results with snippet.
export function searchMessages(query, limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT
      m.session_id,
      s.project,
      s.updated_at,
      snippet(messages_fts, 2, '<mark>', '</mark>', '…', 20) AS snippet,
      rank
    FROM messages_fts
    JOIN messages m ON messages_fts.rowid = m.id
    JOIN sessions s ON m.session_id = s.id
    WHERE messages_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(query + '*', limit);
}

// Analytics: heatmap (last 365 days), tool usage (top 10), project breakdown.
export function getAnalytics() {
  const db = getDb();

  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;

  const heatmapRows = db.prepare(`
    SELECT
      date(timestamp / 1000, 'unixepoch', 'localtime') AS date,
      COUNT(*) AS count
    FROM messages
    WHERE timestamp >= ?
    GROUP BY date
    ORDER BY date
  `).all(cutoff);

  const allSessions = db.prepare('SELECT tool_calls FROM sessions').all();
  const toolMap = {};
  for (const row of allSessions) {
    try {
      const tools = JSON.parse(row.tool_calls || '[]');
      for (const t of tools) {
        toolMap[t.name] = (toolMap[t.name] || 0) + t.count;
      }
    } catch {}
  }
  const toolUsage = Object.entries(toolMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const projectBreakdown = db.prepare(`
    SELECT
      project,
      COUNT(*) AS sessions,
      SUM(message_count) AS messages,
      MAX(updated_at) AS last_active
    FROM sessions
    GROUP BY project
    ORDER BY sessions DESC
  `).all();

  return { heatmap: heatmapRows, toolUsage, projectBreakdown };
}

// Atomically replace all messages for a session (clears old, inserts new in one transaction).
export function replaceMessages(sessionId, msgs) {
  const db = getDb();
  const del = db.prepare('DELETE FROM messages WHERE session_id = ?');
  const ins = db.prepare(`
    INSERT INTO messages (session_id, role, content, timestamp, tools_used)
    VALUES (@session_id, @role, @content, @timestamp, @tools_used)
  `);
  db.transaction(() => {
    del.run(sessionId);
    for (const m of msgs) ins.run(m);
  })();
}
