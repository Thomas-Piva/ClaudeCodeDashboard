# Design: agentsview Feature Integration

**Date:** 2026-04-13  
**Version target:** v5.0.0  
**Status:** Approved

---

## Overview

Integrate key features from [agentsview](https://github.com/wesm/agentsview) into the Claude Code Dashboard (v4.5.0). The dashboard currently monitors Claude Code project status in real-time via WebSocket. This integration adds: full-text search across session messages, an analytics dashboard, a session viewer (inline list + dedicated page), and HTML export.

**Tech stack additions:** `better-sqlite3` (Node.js), `react-router-dom` (frontend).

---

## Architecture

### Backend additions

```
backend/
  db.js          ← SQLite layer: schema init, upsert, query helpers
  indexer.js     ← Parses JSONL files → writes to SQLite FTS5
  server.js      ← Extended: new REST endpoints
  watcher.js     ← Extended: triggers indexer on file change (existing hook)
  claude-watcher.js ← Extended: triggers indexer when new session discovered
```

### Frontend additions

```
frontend/src/
  App.jsx              ← Extended: add react-router, SearchBar (Cmd+K), nav links
  pages/
    Dashboard.jsx      ← Existing App content moved here (active/check/idle columns)
    Analytics.jsx      ← New: heatmap + tool usage + project breakdown
    Session.jsx        ← New: /session/:id — full message viewer + export
  components/
    SearchBar.jsx      ← New: Cmd+K modal, full-text search results
    SessionList.jsx    ← New: inline list of sessions for a project (in ProjectCard)
    ProjectCard.jsx    ← Extended: "N sessioni" link → SessionList inline toggle
```

---

## Database Schema

Single SQLite file: `backend/agentsview.db`

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,         -- SHA1 of file_path, stable identifier
  project TEXT NOT NULL,       -- project name (from existing project config)
  file_path TEXT NOT NULL,     -- absolute path to .jsonl file
  started_at INTEGER,          -- unix ms, first message timestamp
  updated_at INTEGER,          -- unix ms, last message timestamp
  message_count INTEGER DEFAULT 0,
  tool_calls TEXT DEFAULT '[]' -- JSON: [{name: string, count: number}]
);

CREATE VIRTUAL TABLE messages_fts USING fts5(
  session_id UNINDEXED,
  role,                        -- 'user' | 'assistant'
  content,                     -- full text for search
  timestamp UNINDEXED,
  tools_used,                  -- JSON: tool names used in this message
  content=messages_fts,
  tokenize='porter unicode61'
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER,
  tools_used TEXT DEFAULT '[]'
);
```

---

## Backend Endpoints

All new endpoints under `/api/`:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sessions?project=X&limit=20&offset=0` | List sessions, optional project filter |
| `GET` | `/api/sessions/:id` | Session metadata + paginated messages |
| `GET` | `/api/sessions/:id/messages?limit=50&offset=0` | Messages for a session |
| `GET` | `/api/sessions/:id/export` | Download session as HTML file |
| `GET` | `/api/search?q=text&limit=20` | Full-text search, returns `{sessionId, project, snippet, score, timestamp}[]` |
| `GET` | `/api/analytics` | Returns `{heatmap, toolUsage, projectBreakdown}` |

### Analytics response shape

```json
{
  "heatmap": [{ "date": "2026-04-01", "count": 14 }],
  "toolUsage": [{ "name": "Bash", "count": 342 }, ...],
  "projectBreakdown": [{ "project": "MyApp", "sessions": 7, "messages": 234 }, ...]
}
```

---

## Indexer

`indexer.js` exports:

```js
indexSession(filePath, projectName)
  // Reads JSONL, parses Claude Code message format
  // Extracts: role, content (text parts), tool calls, timestamps
  // Upserts session + messages into SQLite
  // Idempotent: re-indexing same file is safe (delete old messages, reinsert)
```

**Integration points:**
- `claude-watcher.js`: calls `indexSession()` when active session file changes
- `server.js` startup: indexes all known JSONL files not yet in DB (catch-up indexing)
- `watcher.js`: calls `indexSession()` when `.claude/projects/` directory gets new file

**JSONL parsing:** Claude Code JSONL format has one JSON object per line. Each line is a message with `type`, `role`, `content` (array of content blocks). Tool use blocks have `type: "tool_use"`, `name`, `input`. Text blocks have `type: "text"`, `text`.

---

## Frontend

### Routing

`App.jsx` wraps everything in `<BrowserRouter>`. Routes:

```
/              → Dashboard (existing 3-column layout)
/analytics     → Analytics page
/session/:id   → Session detail page
```

Header gets two nav links: `ANALYTICS` and — only when inside session — a back arrow.

### SearchBar (Cmd+K)

- Global keyboard shortcut `Cmd+K` / `Ctrl+K` opens modal overlay
- Input debounces 200ms, calls `GET /api/search?q=...`
- Results show: project name, snippet with highlight, date
- Click result → navigates to `/session/:id`
- `Escape` closes

### ProjectCard extension

- Shows `N sessioni` chip below project name
- Click → inline `<SessionList>` toggles open (accordion style)
- `SessionList` shows last 5 sessions sorted by `updated_at`; click → `/session/:id`

### Session page (`/session/:id`)

- Header: project name, date, message count, export button
- Messages rendered in chronological order (toggle: newest first / oldest first — `o` key)
- Thinking blocks collapsed by default, toggle with `t` key
- Tool call blocks shown as compact chips
- Export button → `GET /api/sessions/:id/export` → browser download

### Analytics page

Three sections, vertically stacked:
1. **Activity heatmap** — GitHub-style calendar grid, last 365 days, colored by message count
2. **Tool usage** — horizontal bar chart (top 10 tools by call count)
3. **Project breakdown** — table: project, sessions count, messages count, last active

All data from single `GET /api/analytics` call on mount.

---

## HTML Export

Generated server-side. Self-contained HTML file with:
- Inline CSS (dark theme matching dashboard style)
- All messages rendered in `<div>` blocks
- Tool calls shown as preformatted blocks
- No external dependencies (fully offline-readable)

---

## Error Handling

- Indexer errors are logged but never crash the main server
- SQLite write errors on individual messages are skipped (partial index is acceptable)
- Search endpoint returns `[]` on DB error (not 500)
- Analytics returns zeroed data structure on DB error
- Frontend shows empty states gracefully: "Nessun risultato", "Nessuna sessione"

---

## Keyboard Shortcuts (frontend-wide)

| Key | Action |
|-----|--------|
| `Cmd/Ctrl+K` | Open search modal |
| `Escape` | Close modal / go back |
| `j` / `k` | Next / prev message (on session page) |
| `o` | Toggle sort order (session page) |
| `t` | Toggle thinking blocks (session page) |

---

## Build Sequence

1. Add `better-sqlite3` to backend deps
2. Add `react-router-dom` to frontend deps
3. Implement `backend/db.js`
4. Implement `backend/indexer.js`
5. Extend `server.js`: startup catch-up indexing + new endpoints
6. Extend `claude-watcher.js`: call indexer on session update
7. Frontend: add router, move existing App to Dashboard.jsx
8. Implement `SearchBar.jsx`
9. Extend `ProjectCard.jsx` + implement `SessionList.jsx`
10. Implement `Session.jsx` page
11. Implement `Analytics.jsx` page
