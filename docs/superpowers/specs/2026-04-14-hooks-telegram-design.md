# Design: Hooks + Telegram Integration

**Date:** 2026-04-14
**Version target:** v5.1.0
**Status:** Approved

---

## Overview

Integrate Claude Code hooks (user-level, all projects) with the existing dashboard backend to:
1. Drive real-time project status (Active / Waiting / Da controllare) via push events instead of polling
2. Send Telegram notifications on session end and Bash errors

Architecture choice: hooks POST to existing dashboard backend (`/api/hook-event`). Dashboard routes events to WebSocket broadcast and Telegram API. Hooks fail silently if dashboard is not running — Claude Code is never blocked.

---

## Architecture

```
Claude Code (any project)
  │
  ├─ PreToolUse  ──┐
  ├─ PostToolUse ──┤── ~/.claude/hooks/hook-event.sh ──► POST /api/hook-event
  ├─ Notification ─┤                                      (dashboard backend)
  └─ Stop ─────────┘                                           │
                                                     ┌─────────┴─────────┐
                                                     ▼                   ▼
                                              WebSocket broadcast   Telegram API
                                              (real-time status)   (notify user)
                                                     │
                                               Dashboard UI
                                            (🟢 / 🟡 / 🔴 per project)
```

---

## Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `hook-event.sh` | `~/.claude/hooks/hook-event.sh` | Universal hook script — reads stdin JSON, POSTs to dashboard |
| Hook config | `~/.claude/settings.json` | User-level hooks for Stop, PreToolUse, PostToolUse, Notification |
| `backend/telegram.js` | New file | Telegram Bot API helper — `sendTelegram(text)` |
| `POST /api/hook-event` | `backend/server.js` | Routes hook events → WebSocket broadcast + Telegram |
| Dashboard.jsx | `frontend/src/pages/Dashboard.jsx` | Handles `hook_status` WebSocket messages, shows badge |
| `.env` | Project root | `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID` |

---

## Hook Script

`~/.claude/hooks/hook-event.sh`:
```bash
#!/bin/bash
INPUT=$(cat)
curl -s -X POST "http://localhost:3001/api/hook-event" \
  -H "Content-Type: application/json" \
  -d "$INPUT" > /dev/null 2>&1 || true
```

Key properties:
- `|| true` ensures hook never crashes Claude Code if dashboard is down
- Single universal script for all event types — event name comes from stdin JSON (`hook_event_name` field)
- Must be executable: `chmod +x ~/.claude/hooks/hook-event.sh`

---

## Hook Configuration

`~/.claude/settings.json` (merged into existing file, preserve existing keys):
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [{"type": "command", "command": "~/.claude/hooks/hook-event.sh"}]
      }
    ],
    "PreToolUse": [
      {
        "hooks": [{"type": "command", "command": "~/.claude/hooks/hook-event.sh"}]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [{"type": "command", "command": "~/.claude/hooks/hook-event.sh"}]
      }
    ],
    "Notification": [
      {
        "hooks": [{"type": "command", "command": "~/.claude/hooks/hook-event.sh"}]
      }
    ]
  }
}
```

---

## Claude Code Hook Payload Format

Claude Code sends JSON to hook stdin. Relevant fields per event:

**Stop:**
```json
{
  "hook_event_name": "Stop",
  "session_id": "abc123",
  "project_path": "/path/to/project",
  "transcript_path": "/path/to/session.jsonl"
}
```

**PreToolUse / PostToolUse:**
```json
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test" },
  "tool_response": { "exit_code": 1, "stdout": "", "stderr": "..." },
  "session_id": "abc123",
  "project_path": "/path/to/project"
}
```

**Notification:**
```json
{
  "hook_event_name": "Notification",
  "message": "Claude is waiting for your input",
  "session_id": "abc123",
  "project_path": "/path/to/project"
}
```

---

## Backend: telegram.js

```js
// backend/telegram.js
// Uses Node 18+ native fetch — no extra dependency needed

const BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

export async function sendTelegram(text) {
  if (!process.env.TELEGRAM_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`${BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });
  } catch (e) {
    console.error('[telegram] send failed:', e.message);
  }
}
```

---

## Backend: POST /api/hook-event

Added to `backend/server.js`. Routing logic:

| Event | Condition | Action |
|-------|-----------|--------|
| `PreToolUse` | any tool | broadcast `hook_status: 'active'` |
| `Notification` | any | broadcast `hook_status: 'waiting'` |
| `Stop` | always | broadcast `hook_status: 'review'` + Telegram "✅ [Project] — sessione terminata" |
| `PostToolUse` | `tool_name === 'Bash'` AND `exit_code !== 0` | Telegram "💥 [Project] — errore: [cmd] (exit [code])" |

WebSocket broadcast message shape:
```json
{
  "type": "hook_status",
  "projectPath": "/path/to/project",
  "projectName": "MyProject",
  "status": "active",
  "timestamp": 1713100000000
}
```

Project name derived from `path.basename(project_path)`.

Endpoint validates: body must be JSON with `hook_event_name` string. Returns 400 on invalid input, 200 on success (even if Telegram fails — Telegram errors are logged, not surfaced).

---

## Frontend: Dashboard.jsx

New state: `hookStatuses` — map of `projectPath → { status, timestamp }`.

```js
const [hookStatuses, setHookStatuses] = useState({});

// Inside ws.onmessage handler (already exists):
if (msg.type === 'hook_status') {
  setHookStatuses(prev => ({
    ...prev,
    [msg.projectPath]: { status: msg.status, ts: msg.timestamp }
  }));
}
```

Hook status badge on each project card — overlays existing status when present:

| `status` value | Badge |
|----------------|-------|
| `'active'` | 🟢 Attivo |
| `'waiting'` | 🟡 In attesa |
| `'review'` | 🔴 Da controllare |

Badge shows project name + status. Fades after 30 minutes of inactivity (timestamp-based).

---

## Environment Variables

`.env` (project root, never committed):
```
TELEGRAM_TOKEN=<bot_token>
TELEGRAM_CHAT_ID=181756177
```

`.env.example` (committed):
```
TELEGRAM_TOKEN=
TELEGRAM_CHAT_ID=
```

Backend loads `.env` via `dotenv` at startup (add `import 'dotenv/config'` to server.js if not present, or use `--env-file .env` in start script).

---

## Error Handling

- Hook script: `|| true` — never blocks Claude
- `POST /api/hook-event`: returns 200 always (errors logged server-side)
- Telegram failures: caught, logged, never propagate to endpoint response
- Missing env vars: `sendTelegram` no-ops silently
- Invalid hook payload: 400 logged, not surfaced to Claude

---

## File Changes Summary

**New files:**
- `~/.claude/hooks/hook-event.sh`
- `backend/telegram.js`
- `.env` (local only)
- `.env.example`

**Modified files:**
- `~/.claude/settings.json` — add hooks config (merge, preserve existing keys)
- `backend/server.js` — add `POST /api/hook-event`, import telegram.js
- `frontend/src/pages/Dashboard.jsx` — handle `hook_status` WebSocket, show badge
- `backend/package.json` — add `dotenv` if not present (native fetch used, no node-fetch needed)
- `start.bat` — pass `--env-file .env` or ensure dotenv loads

---

## Build Sequence

1. Create `~/.claude/hooks/hook-event.sh` + chmod +x
2. Merge hooks config into `~/.claude/settings.json`
3. Add `dotenv` + `node-fetch` to backend deps if missing
4. Implement `backend/telegram.js`
5. Add `POST /api/hook-event` to `backend/server.js`
6. Update `frontend/src/pages/Dashboard.jsx` — hookStatuses state + badge
7. Create `.env` + `.env.example`
8. Test end-to-end: trigger hook → verify WebSocket + Telegram
