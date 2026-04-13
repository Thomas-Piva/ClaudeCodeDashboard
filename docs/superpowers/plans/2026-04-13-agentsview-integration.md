# agentsview Feature Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-text search, analytics dashboard, session viewer, and HTML export to the Claude Code Dashboard (v4.5.0), inspired by agentsview.

**Architecture:** A new `backend/db.js` initializes a SQLite DB with FTS5. `backend/indexer.js` parses JSONL files and upserts sessions/messages. `server.js` gains REST endpoints. The frontend gains `react-router-dom`, a `Cmd+K` search modal, session list in ProjectCard, a `/session/:id` page, and an `/analytics` page.

**Tech Stack:** Node.js ESM + `better-sqlite3`, React 18 + `react-router-dom` v6, Vite, pure-CSS charts (no chart library).

---

## File Map

**Create:**
- `backend/db.js` — SQLite init, schema, all query helpers
- `backend/indexer.js` — JSONL parser + DB upsert, exports `indexSession(filePath, projectName)`
- `frontend/src/pages/Dashboard.jsx` — existing App.jsx content (3-column layout)
- `frontend/src/pages/Session.jsx` — `/session/:id` page
- `frontend/src/pages/Analytics.jsx` — `/analytics` page
- `frontend/src/components/SearchBar.jsx` — `Cmd+K` modal
- `frontend/src/components/SessionList.jsx` — inline session list for ProjectCard

**Modify:**
- `backend/server.js` — add 6 new endpoints + startup catch-up indexing
- `backend/claude-watcher.js` — call `indexSession()` on session file change
- `frontend/src/App.jsx` — add BrowserRouter, routes, SearchBar, nav links
- `frontend/src/components/ProjectCard.jsx` — add "N sessioni" chip + SessionList toggle
- `frontend/package.json` — add react-router-dom
- `backend/package.json` — add better-sqlite3

---

## Task 1: Install dependencies

**Files:**
- Modify: `backend/package.json`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install better-sqlite3 in backend**

```bash
cd backend && npm install better-sqlite3
```

Expected output: `added 1 package` (ships prebuilt binaries, no compilation needed on Node 18+/20+).
If you get a build error, run: `npm install --build-from-source better-sqlite3` (requires Visual C++ Build Tools).

- [ ] **Step 2: Install react-router-dom in frontend**

```bash
cd ../frontend && npm install react-router-dom
```

Expected output: `added N packages`.

- [ ] **Step 3: Commit**

```bash
cd .. && git add backend/package.json backend/package-lock.json frontend/package.json frontend/package-lock.json
git commit -m "chore: add better-sqlite3 and react-router-dom"
```

---

## Task 2: SQLite layer — `backend/db.js`

**Files:**
- Create: `backend/db.js`

- [ ] **Step 1: Create `backend/db.js`**

```js
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

    CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, session_id, role, content, timestamp, tools_used)
        VALUES ('delete', old.id, old.session_id, old.role, old.content, old.timestamp, old.tools_used);
    END;
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
```

- [ ] **Step 2: Verify module loads without error**

```bash
cd backend && node -e "import('./db.js').then(m => { m.getDb(); console.log('DB OK'); })"
```

Expected: `DB OK` and a file `backend/agentsview.db` is created.

- [ ] **Step 3: Commit**

```bash
git add backend/db.js backend/agentsview.db
```

Add `backend/agentsview.db` to `.gitignore` first:

```bash
echo "backend/agentsview.db" >> .gitignore
git add .gitignore backend/db.js
git commit -m "feat: SQLite layer with FTS5 schema (db.js)"
```

---

## Task 3: Indexer — `backend/indexer.js`

**Files:**
- Create: `backend/indexer.js`

- [ ] **Step 1: Create `backend/indexer.js`**

```js
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
```

- [ ] **Step 2: Smoke-test the indexer manually**

```bash
cd backend && node -e "
import('./indexer.js').then(async ({ indexSession }) => {
  // Use any real .jsonl file from ~/.claude/projects/
  const os = await import('os');
  const path = await import('path');
  const fs = await import('fs');
  const dir = path.join(os.default.homedir(), '.claude', 'projects');
  if (!fs.default.existsSync(dir)) { console.log('No sessions dir'); return; }
  const projects = fs.default.readdirSync(dir);
  if (!projects.length) { console.log('No projects'); return; }
  const files = fs.default.readdirSync(path.join(dir, projects[0])).filter(f => f.endsWith('.jsonl'));
  if (!files.length) { console.log('No jsonl'); return; }
  indexSession(path.join(dir, projects[0], files[0]), projects[0]);
  console.log('Done');
});
"
```

Expected: `📚 Indexed: <project> — N messages` with no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/indexer.js
git commit -m "feat: JSONL indexer with FTS5 upsert (indexer.js)"
```

---

## Task 4: Backend endpoints in `server.js`

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Add import and startup catch-up indexing**

At the top of `server.js`, after the existing imports, add:

```js
import { listSessions, getSession, getMessages, searchMessages, getAnalytics, getDb } from './db.js';
import { indexSession } from './indexer.js';
```

After the line where `config` is built (around line 100+, after scan paths and project loading), add a startup catch-up call. Find the section where `watcher` is initialized (after `config` is set) and add before it:

```js
// ── Catch-up indexing on startup ─────────────────────
(async () => {
  try {
    const os = await import('os');
    const claudeDir = path.join(os.default.homedir(), '.claude', 'projects');
    if (fs.existsSync(claudeDir)) {
      const projectDirs = fs.readdirSync(claudeDir);
      for (const dir of projectDirs) {
        const dirPath = path.join(claudeDir, dir);
        if (!fs.statSync(dirPath).isDirectory()) continue;
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jsonl'));
        for (const file of files) {
          indexSession(path.join(dirPath, file), dir);
        }
      }
    }
  } catch (err) {
    console.error('Catch-up indexing error:', err.message);
  }
})();
```

- [ ] **Step 2: Add REST endpoints**

Before the line `server.listen(PORT, ...)`, add these 6 endpoints:

```js
// ── REST: Sessions ───────────────────────────────────
app.get('/api/sessions', (req, res) => {
  try {
    const { project, limit = '20', offset = '0' } = req.query;
    const sessions = listSessions({ project, limit: parseInt(limit), offset: parseInt(offset) });
    res.json(sessions);
  } catch (err) {
    console.error('GET /api/sessions error:', err.message);
    res.json([]);
  }
});

app.get('/api/sessions/:id', (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Not found' });
    const { limit = '50', offset = '0' } = req.query;
    const messages = getMessages(req.params.id, { limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ ...session, messages });
  } catch (err) {
    console.error('GET /api/sessions/:id error:', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/sessions/:id/messages', (req, res) => {
  try {
    const { limit = '50', offset = '0' } = req.query;
    const messages = getMessages(req.params.id, { limit: parseInt(limit), offset: parseInt(offset) });
    res.json(messages);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/sessions/:id/export', (req, res) => {
  try {
    const session = getSession(req.params.id);
    if (!session) return res.status(404).send('Not found');
    const messages = getMessages(req.params.id, { limit: 10000 });

    const escHtml = s => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    const msgsHtml = messages.map(m => {
      const tools = (() => { try { return JSON.parse(m.tools_used || '[]'); } catch { return []; } })();
      const toolChips = tools.map(t => `<span class="tool-chip">${escHtml(t)}</span>`).join('');
      return `<div class="msg msg-${escHtml(m.role)}">
  <div class="msg-role">${escHtml(m.role)}${toolChips}</div>
  <div class="msg-content">${escHtml(m.content)}</div>
</div>`;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>${escHtml(session.project)} — Claude Code Session</title>
<style>
  body{background:#090b12;color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:13px;padding:32px;max-width:900px;margin:0 auto}
  h1{font-size:1.1rem;color:#f8fafc;margin-bottom:4px}
  .meta{font-size:0.75rem;color:#64748b;margin-bottom:24px}
  .msg{border:1px solid #1e293b;border-radius:8px;padding:14px 16px;margin-bottom:12px}
  .msg-user{border-color:#1e3a5f;background:rgba(30,58,95,0.15)}
  .msg-assistant{border-color:#1a2e1a;background:rgba(20,40,20,0.15)}
  .msg-role{font-size:0.65rem;letter-spacing:.1em;text-transform:uppercase;color:#475569;margin-bottom:8px;display:flex;align-items:center;gap:6px}
  .msg-user .msg-role{color:#60a5fa}
  .msg-assistant .msg-role{color:#4ade80}
  .msg-content{white-space:pre-wrap;line-height:1.6;color:#cbd5e1}
  .tool-chip{background:rgba(100,181,246,0.12);color:#64b5f6;border:1px solid rgba(100,181,246,0.3);border-radius:4px;padding:1px 6px;font-size:0.6rem}
</style>
</head>
<body>
<h1>${escHtml(session.project)}</h1>
<div class="meta">${new Date(session.updated_at).toLocaleString('it-IT')} · ${session.message_count} messaggi</div>
${msgsHtml}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${session.project.replace(/[^a-z0-9]/gi, '_')}_session.html"`);
    res.send(html);
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).send('Error');
  }
});

// ── REST: Search ─────────────────────────────────────
app.get('/api/search', (req, res) => {
  try {
    const { q = '', limit = '20' } = req.query;
    if (!q.trim()) return res.json([]);
    const results = searchMessages(q.trim(), parseInt(limit));
    res.json(results);
  } catch (err) {
    console.error('Search error:', err.message);
    res.json([]);
  }
});

// ── REST: Analytics ──────────────────────────────────
app.get('/api/analytics', (req, res) => {
  try {
    res.json(getAnalytics());
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.json({ heatmap: [], toolUsage: [], projectBreakdown: [] });
  }
});
```

- [ ] **Step 3: Verify endpoints manually**

Start the backend: `cd backend && node server.js`

In another terminal:
```bash
curl http://localhost:3001/api/sessions
curl "http://localhost:3001/api/search?q=test"
curl http://localhost:3001/api/analytics
```

Expected: all return valid JSON (empty arrays/objects are fine if no data yet).

- [ ] **Step 4: Commit**

```bash
git add backend/server.js
git commit -m "feat: REST endpoints for sessions, search, analytics, export"
```

---

## Task 5: Wire indexer into `claude-watcher.js`

**Files:**
- Modify: `backend/claude-watcher.js`

- [ ] **Step 1: Add indexer import**

At the top of `claude-watcher.js`, after existing imports, add:

```js
import { indexSession } from './indexer.js';
```

- [ ] **Step 2: Call indexer when session file changes**

Find the method in `ClaudeSessionWatcher` that processes a session file update (the callback passed to chokidar's `change` event on JSONL files — look for where `readLastLine` or `extractActivityInfo` is called on a file path, typically inside a `watcher.on('change', ...)` handler).

After the existing status-update logic, at the end of the change handler, add:

```js
// Re-index session in background (non-blocking)
setImmediate(() => {
  try {
    indexSession(filePath, projectName);
  } catch {}
});
```

where `filePath` is the JSONL path and `projectName` is the project name already available in that scope.

> **Note:** The exact variable names differ by context. Search for the `chokidar.watch(` call that watches `.jsonl` files. The change handler receives the file path as first argument. The project name can be derived from `this.projects.find(...)` matching the path.

- [ ] **Step 3: Verify (manual)**

Start the backend. Open a project with an active Claude session. After Claude takes an action, check:
```bash
curl http://localhost:3001/api/sessions
```
The session should appear (or `message_count` should increment).

- [ ] **Step 4: Commit**

```bash
git add backend/claude-watcher.js
git commit -m "feat: trigger indexer on session file change"
```

---

## Task 6: Frontend routing — refactor `App.jsx` + create `Dashboard.jsx`

**Files:**
- Create: `frontend/src/pages/Dashboard.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Create `frontend/src/pages/Dashboard.jsx`**

Copy all content from current `App.jsx` into `Dashboard.jsx`, but:
- Change the function name from `App` to `Dashboard`
- Change the export to `export default function Dashboard()`
- Keep all existing imports and logic intact

```jsx
import React, { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import ProjectCard from '../components/ProjectCard';
import AdminPanel from '../components/AdminPanel';

// ... (copy ColHeader, EmptySlot, and all logic from App.jsx verbatim)

export default function Dashboard() {
  // ... (exact same body as current App function)
}
```

- [ ] **Step 2: Rewrite `App.jsx` as router shell**

Replace entire `App.jsx` with:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Session from './pages/Session';
import SearchBar from './components/SearchBar';

function AppShell() {
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(v => !v);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearchResult = useCallback((sessionId) => {
    setShowSearch(false);
    navigate(`/session/${sessionId}`);
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      {/* Global search shortcut hint in header — handled by SearchBar */}
      {showSearch && (
        <SearchBar
          onClose={() => setShowSearch(false)}
          onSelect={handleSearchResult}
        />
      )}

      {/* Nav links injected into each page's header via context — simpler: just render here as floating bar */}
      <div style={{
        position: 'fixed', bottom: 20, right: 24, zIndex: 100,
        display: 'flex', gap: 8
      }}>
        <NavLink to="/" end style={navStyle}>DASHBOARD</NavLink>
        <NavLink to="/analytics" style={navStyle}>ANALYTICS</NavLink>
        <button
          onClick={() => setShowSearch(true)}
          style={{ ...navStyle, cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.04)' }}
          title="Cmd+K"
        >
          CERCA
        </button>
      </div>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/session/:id" element={<Session />} />
      </Routes>
    </div>
  );
}

const navStyle = {
  display: 'inline-flex', alignItems: 'center',
  padding: '6px 12px',
  background: 'rgba(10,12,20,0.92)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem',
  fontWeight: 600, letterSpacing: '0.1em',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  transition: 'color 0.15s, border-color 0.15s',
};

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Create stub files so the app compiles**

Create `frontend/src/pages/Analytics.jsx`:
```jsx
export default function Analytics() {
  return <div style={{ padding: 32, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono,monospace' }}>Analytics — coming soon</div>;
}
```

Create `frontend/src/pages/Session.jsx`:
```jsx
export default function Session() {
  return <div style={{ padding: 32, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono,monospace' }}>Session viewer — coming soon</div>;
}
```

Create `frontend/src/components/SearchBar.jsx`:
```jsx
export default function SearchBar({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120 }}
      onClick={onClose}>
      <div style={{ background: '#0d1117', border: '1px solid var(--border-mid)', borderRadius: 12, padding: 20, width: 560, color: 'var(--text-primary)' }}
        onClick={e => e.stopPropagation()}>
        Search — coming soon
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify app compiles and runs**

```bash
cd frontend && npm run dev
```

Open `http://localhost:5173`. Dashboard should look identical to before. Bottom-right shows nav pills: DASHBOARD / ANALYTICS / CERCA. No console errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/pages/Dashboard.jsx frontend/src/pages/Analytics.jsx frontend/src/pages/Session.jsx frontend/src/components/SearchBar.jsx
git commit -m "feat: react-router shell, Dashboard extracted, stub pages"
```

---

## Task 7: `SearchBar.jsx` — full implementation

**Files:**
- Modify: `frontend/src/components/SearchBar.jsx`

- [ ] **Step 1: Replace stub with full implementation**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config.js';

function highlight(text) {
  // text already contains <mark> tags from FTS5 snippet — render safely
  // Replace <mark> with styled span via dangerouslySetInnerHTML
  return { __html: text.replace(/<mark>/g, '<mark style="background:rgba(251,191,36,0.3);color:#fbbf24;border-radius:2px">').replace(/<\/mark>/g, '</mark>') };
}

function fmt(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SearchBar({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=12`);
        const data = await res.json();
        setResults(data);
        setSelected(0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(v => Math.min(v + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(v => Math.max(v - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) { onSelect(results[selected].session_id); }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#0d1117', border: '1px solid var(--border-mid)', borderRadius: 12, width: 580, maxHeight: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-dim)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Cerca nei messaggi..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem',
              color: 'var(--text-primary)', letterSpacing: '0.02em'
            }}
          />
          {loading && <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>...</span>}
          <kbd style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--text-muted)', border: '1px solid var(--border-dim)', borderRadius: 4, padding: '2px 5px' }}>esc</kbd>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.length === 0 && query.trim() && !loading && (
            <div style={{ padding: '20px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              // nessun risultato
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => onSelect(r.session_id)}
              style={{
                padding: '10px 16px',
                background: i === selected ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderBottom: '1px solid var(--border-dim)',
                cursor: 'pointer',
                transition: 'background 0.1s'
              }}
              onMouseEnter={() => setSelected(i)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-bright)' }}>{r.project}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--text-muted)' }}>{fmt(r.updated_at)}</span>
              </div>
              <div
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}
                dangerouslySetInnerHTML={highlight(r.snippet || '')}
              />
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-dim)', display: 'flex', gap: 12 }}>
          {[['↑↓', 'naviga'], ['↵', 'apri'], ['esc', 'chiudi']].map(([k, v]) => (
            <span key={k} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
              <kbd style={{ border: '1px solid var(--border-dim)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>{k}</kbd>{v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify search works**

Start both backend and frontend. Press `Ctrl+K`. Type a word that appears in a Claude session. Results should appear with highlighted snippets.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SearchBar.jsx
git commit -m "feat: Cmd+K search modal with FTS5 results and keyboard nav"
```

---

## Task 8: `SessionList.jsx` + extend `ProjectCard.jsx`

**Files:**
- Create: `frontend/src/components/SessionList.jsx`
- Modify: `frontend/src/components/ProjectCard.jsx`

- [ ] **Step 1: Create `frontend/src/components/SessionList.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config.js';

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function SessionList({ projectName }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/api/sessions?project=${encodeURIComponent(projectName)}&limit=5`)
      .then(r => r.json())
      .then(data => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectName]);

  if (loading) return (
    <div style={{ padding: '8px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
      caricamento...
    </div>
  );

  if (!sessions.length) return (
    <div style={{ padding: '8px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
      // nessuna sessione indicizzata
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
      {sessions.map(s => (
        <div
          key={s.id}
          onClick={() => navigate(`/session/${s.id}`)}
          style={{
            padding: '6px 10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-dim)',
            borderRadius: 5,
            cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'background 0.12s, border-color 0.12s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'var(--border-dim)'; }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
            {s.message_count} msg
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            {fmt(s.updated_at)}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Extend `ProjectCard.jsx`**

Add import at top of `ProjectCard.jsx`:
```jsx
import SessionList from './SessionList.jsx';
```

Add state inside `ProjectCard`:
```jsx
const [showSessions, setShowSessions] = useState(false);
```

Add this block after the `{/* ── No Data ── */}` block, before the closing `</div>` of the card:

```jsx
{/* ── Sessioni ────────────────────────────────────── */}
<div style={{ marginTop: 10 }}>
  <button
    onClick={() => setShowSessions(v => !v)}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 5,
      fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem',
      color: 'var(--text-secondary)', cursor: 'pointer',
      transition: 'border-color 0.15s, color 0.15s'
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
  >
    {showSessions ? '▼' : '▶'} sessioni
  </button>
  {showSessions && <SessionList projectName={project.name} />}
</div>
```

- [ ] **Step 3: Verify**

In the dashboard, click "sessioni" on any ProjectCard. List of indexed sessions appears. Click a row → navigates to `/session/:id` (stub page for now).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/SessionList.jsx frontend/src/components/ProjectCard.jsx
git commit -m "feat: SessionList inline accordion in ProjectCard"
```

---

## Task 9: `Session.jsx` — full implementation

**Files:**
- Modify: `frontend/src/pages/Session.jsx`

- [ ] **Step 1: Replace stub with full Session page**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config.js';

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ToolChip({ name }) {
  return (
    <span style={{
      background: 'rgba(100,181,246,0.1)', color: 'var(--blue)',
      border: '1px solid rgba(100,181,246,0.25)',
      borderRadius: 4, padding: '1px 6px',
      fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem',
      marginLeft: 6
    }}>{name}</span>
  );
}

function Message({ msg, isSelected, showThinking, index }) {
  const isUser = msg.role === 'user';
  const isThinking = msg.content.startsWith('[thinking]');
  const tools = (() => { try { return JSON.parse(msg.tools_used || '[]'); } catch { return []; } })();

  if (isThinking && !showThinking) return null;

  return (
    <div
      data-index={index}
      style={{
        padding: '12px 16px',
        background: isSelected
          ? 'rgba(251,191,36,0.06)'
          : isUser
            ? 'rgba(30,58,95,0.12)'
            : 'rgba(20,40,20,0.1)',
        border: `1px solid ${isSelected ? 'rgba(251,191,36,0.3)' : isUser ? 'rgba(30,58,95,0.4)' : 'rgba(20,40,20,0.4)'}`,
        borderRadius: 8, marginBottom: 8,
        transition: 'background 0.15s, border-color 0.15s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 4 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: isUser ? 'var(--blue)' : 'var(--green)',
          fontWeight: 600
        }}>{msg.role}</span>
        {tools.map((t, i) => <ToolChip key={i} name={t} />)}
        <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
          {fmt(msg.timestamp)}
        </span>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
        color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function Session() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reversed, setReversed] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/sessions/${id}?limit=1000`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => {
        setSession(data);
        setMessages(data.messages || []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  // Keyboard shortcuts: j/k, o, t
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'j') setSelectedIdx(v => Math.min(v + 1, messages.length - 1));
      if (e.key === 'k') setSelectedIdx(v => Math.max(v - 1, 0));
      if (e.key === 'o') setReversed(v => !v);
      if (e.key === 't') setShowThinking(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [messages.length]);

  const handleExport = () => {
    window.open(`${API_BASE}/api/sessions/${id}/export`, '_blank');
  };

  const displayed = reversed ? [...messages].reverse() : messages;

  if (loading) return (
    <div style={{ padding: 48, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      caricamento...
    </div>
  );

  if (error) return (
    <div style={{ padding: 48, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--red)' }}>
      ✗ {error}
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 32px 72px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1, padding: '2px 4px', marginTop: 2 }}
          title="Torna al dashboard"
        >←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-bright)', margin: '0 0 4px' }}>
            {session?.project}
          </h1>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
            <span>{session?.message_count} messaggi</span>
            <span>aggiornato {fmt(session?.updated_at)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowThinking(v => !v)}
            title="Toggle thinking blocks (t)"
            style={toolbarBtn(showThinking)}
          >
            {showThinking ? '◎ thinking' : '○ thinking'}
          </button>
          <button
            onClick={() => setReversed(v => !v)}
            title="Toggle sort order (o)"
            style={toolbarBtn(reversed)}
          >
            {reversed ? '↑ recenti' : '↓ vecchi'}
          </button>
          <button onClick={handleExport} style={toolbarBtn(false)} title="Scarica HTML">
            ↓ export
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', gap: 14 }}>
        {[['j/k', 'naviga'], ['o', 'ordine'], ['t', 'thinking']].map(([k, v]) => (
          <span key={k}><kbd style={{ border: '1px solid var(--border-dim)', borderRadius: 3, padding: '1px 4px', marginRight: 3 }}>{k}</kbd>{v}</span>
        ))}
      </div>

      {/* Messages */}
      {displayed.map((msg, i) => (
        <Message
          key={msg.id}
          msg={msg}
          index={i}
          isSelected={i === selectedIdx}
          showThinking={showThinking}
        />
      ))}
    </div>
  );
}

function toolbarBtn(active) {
  return {
    padding: '5px 10px',
    background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? 'var(--border-mid)' : 'var(--border-subtle)'}`,
    borderRadius: 6, cursor: 'pointer',
    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    transition: 'all 0.15s'
  };
}
```

- [ ] **Step 2: Verify**

Click a session row in ProjectCard → `/session/:id` shows messages. Press `j`/`k` to navigate, `o` to reverse order, `t` to toggle thinking, export button downloads HTML.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Session.jsx
git commit -m "feat: Session viewer page with keyboard nav and HTML export"
```

---

## Task 10: `Analytics.jsx` — full implementation

**Files:**
- Modify: `frontend/src/pages/Analytics.jsx`

- [ ] **Step 1: Replace stub with full Analytics page**

```jsx
import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';

// GitHub-style heatmap: last 365 days as a grid of squares
function Heatmap({ data }) {
  // Build lookup: date string → count
  const lookup = {};
  for (const d of data) lookup[d.date] = d.count;

  // Generate last 365 days
  const days = [];
  const now = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: lookup[key] || 0 });
  }

  const max = Math.max(...days.map(d => d.count), 1);

  function cellColor(count) {
    if (!count) return 'rgba(255,255,255,0.04)';
    const ratio = count / max;
    if (ratio < 0.25) return 'rgba(0,230,118,0.2)';
    if (ratio < 0.5)  return 'rgba(0,230,118,0.4)';
    if (ratio < 0.75) return 'rgba(0,230,118,0.65)';
    return 'rgba(0,230,118,0.9)';
  }

  // Split into weeks (columns of 7)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map(d => (
              <div
                key={d.key}
                title={`${d.key}: ${d.count} messaggi`}
                style={{
                  width: 11, height: 11, borderRadius: 2,
                  background: cellColor(d.count),
                  transition: 'background 0.1s'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal bar chart (pure CSS)
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {data.map(d => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--text-secondary)', width: 100, flexShrink: 0, textAlign: 'right' }}>
            {d.name}
          </span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 3, height: 14, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.count / max) * 100}%`, height: '100%',
              background: 'rgba(100,181,246,0.6)', borderRadius: 3,
              transition: 'width 0.4s ease'
            }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{
        fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-secondary)', marginBottom: 14,
        paddingBottom: 8, borderBottom: '1px solid var(--border-dim)'
      }}>{title}</div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 48, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      caricamento analytics...
    </div>
  );

  if (!data) return (
    <div style={{ padding: 48, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--red)' }}>
      ✗ errore caricamento dati
    </div>
  );

  const totalMessages = data.heatmap.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 32px 72px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 4 }}>
        ANALYTICS
      </h1>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 28 }}>
        {totalMessages} messaggi negli ultimi 365 giorni
      </p>

      <Section title="Attività nel tempo">
        <Heatmap data={data.heatmap} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
          {['rgba(255,255,255,0.04)', 'rgba(0,230,118,0.2)', 'rgba(0,230,118,0.4)', 'rgba(0,230,118,0.65)', 'rgba(0,230,118,0.9)'].map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)', marginLeft: 4 }}>meno → più</span>
        </div>
      </Section>

      <Section title="Tool usage (top 10)">
        {data.toolUsage.length === 0
          ? <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-muted)' }}>// nessun dato</p>
          : <BarChart data={data.toolUsage} />
        }
      </Section>

      <Section title="Progetti">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Progetto', 'Sessioni', 'Messaggi', 'Ultima attività'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '6px 12px',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-muted)', borderBottom: '1px solid var(--border-dim)'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.projectBreakdown.map(p => (
              <tr key={p.project} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'Syne, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-bright)' }}>{p.project}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.sessions}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.messages || 0}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{fmt(p.last_active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to `/analytics`. Heatmap, tool usage bars, and project table all render. No console errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Analytics.jsx
git commit -m "feat: Analytics page — heatmap, tool usage, project breakdown"
```

---

## Task 11: Version bump and final cleanup

**Files:**
- Modify: `frontend/src/App.jsx` (update version string if present)
- Modify: `frontend/src/pages/Dashboard.jsx` (update footer version)

- [ ] **Step 1: Update version in Dashboard footer**

In `frontend/src/pages/Dashboard.jsx`, find the footer text and update:
```jsx
CLAUDE CODE DASHBOARD v5.0.0 — REACT + WEBSOCKET + SQLITE
```

- [ ] **Step 2: Add `agentsview.db` to .gitignore if not already**

```bash
grep -q "agentsview.db" .gitignore || echo "backend/agentsview.db" >> .gitignore
```

- [ ] **Step 3: Final commit**

```bash
git add frontend/src/pages/Dashboard.jsx .gitignore
git commit -m "chore: v5.0.0 — agentsview integration complete"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Full-text search → Tasks 2, 3, 4, 7
- ✅ Analytics (heatmap, tool usage, project breakdown) → Tasks 2, 4, 10
- ✅ Session viewer inline → Tasks 8
- ✅ Session viewer page `/session/:id` → Task 9
- ✅ HTML export → Task 4 (endpoint), Task 9 (button)
- ✅ Keyboard nav (j/k, o, t, Cmd+K, Escape) → Tasks 6, 7, 9
- ✅ Catch-up indexing on startup → Task 4
- ✅ Live re-indexing on file change → Task 5

**Type consistency:**
- `indexSession(filePath, projectName)` — defined Task 3, called Task 4 and 5 ✅
- `sessionIdFromPath(filePath)` — defined Task 2, used Task 3 ✅
- `getSession(id)` — defined Task 2, used Task 4 ✅
- `getMessages(sessionId, opts)` — defined Task 2, used Task 4 ✅
- `searchMessages(query, limit)` — returns `{session_id, project, updated_at, snippet, rank}[]` — used Task 7 as `r.session_id`, `r.project`, `r.updated_at`, `r.snippet` ✅
