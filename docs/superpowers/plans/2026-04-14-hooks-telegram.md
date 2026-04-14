# Hooks + Telegram Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Claude Code user-level hooks to the dashboard backend so that PreToolUse/PostToolUse/Notification/Stop events update project status in real-time via WebSocket and send Telegram notifications on session end and Bash errors.

**Architecture:** A universal bash hook script POSTs Claude Code stdin JSON to `POST /api/hook-event` on the existing Express backend. The backend routes events: broadcasts `hook_status` WebSocket messages for real-time status badges in the dashboard UI, and calls the Telegram Bot API for Stop and Bash-error events. Node 23's `--env-file` loads `backend/.env` so no dotenv package is needed.

**Tech Stack:** Node.js 23 (native fetch + --env-file), Express, WebSocket (ws), React, Telegram Bot API, Claude Code hooks (bash)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `~/.claude/hooks/hook-event.sh` | Universal hook: reads stdin, POSTs to `/api/hook-event` |
| Modify | `~/.claude/settings.json` | Add hooks config for Stop/PreToolUse/PostToolUse/Notification |
| Create | `backend/.env` | `TELEGRAM_TOKEN` + `TELEGRAM_CHAT_ID` (not committed) |
| Create | `backend/.env.example` | Template with empty values (committed) |
| Create | `backend/telegram.js` | `sendTelegram(text)` helper using native fetch |
| Modify | `backend/server.js` | Import telegram.js; add `POST /api/hook-event` endpoint |
| Modify | `package.json` (root) | Add `--env-file=.env` to dev:backend and start:backend |
| Modify | `frontend/src/hooks/useWebSocket.js` | Add `hookStatuses` state, handle `hook_status` WS messages |
| Modify | `frontend/src/components/ProjectCard.jsx` | Accept + render `hookStatus` prop as badge |
| Modify | `frontend/src/pages/Dashboard.jsx` | Pass `hookStatuses[p.path]` to each ProjectCard |

---

### Task 1: Hook script + settings.json

**Files:**
- Create: `/c/Users/attilio.pregnolato.EGMSISTEMI/.claude/hooks/hook-event.sh`
- Modify: `/c/Users/attilio.pregnolato.EGMSISTEMI/.claude/settings.json`

- [ ] **Step 1: Create hooks directory and script**

```bash
mkdir -p /c/Users/attilio.pregnolato.EGMSISTEMI/.claude/hooks
```

Create `/c/Users/attilio.pregnolato.EGMSISTEMI/.claude/hooks/hook-event.sh`:
```bash
#!/bin/bash
# Claude Code universal hook — POSTs stdin JSON to dashboard backend
INPUT=$(cat)
curl -s -X POST "http://localhost:3001/api/hook-event" \
  -H "Content-Type: application/json" \
  -d "$INPUT" > /dev/null 2>&1 || true
# || true: never block Claude if dashboard is not running
```

- [ ] **Step 2: Make script executable**

```bash
chmod +x /c/Users/attilio.pregnolato.EGMSISTEMI/.claude/hooks/hook-event.sh
```

- [ ] **Step 3: Verify script runs without error**

```bash
echo '{"hook_event_name":"Stop","project_path":"/test"}' | \
  bash /c/Users/attilio.pregnolato.EGMSISTEMI/.claude/hooks/hook-event.sh
echo "exit: $?"
```

Expected output: `exit: 0` (curl fails silently because backend not running yet — that's correct)

- [ ] **Step 4: Add hooks to ~/.claude/settings.json**

Read current `~/.claude/settings.json` first. It contains `model`, `statusLine`, `enabledPlugins`, etc. Add the `hooks` key alongside existing keys:

```json
{
  "model": "opusplan",
  "statusLine": { ... },
  "enabledPlugins": { ... },
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /c/Users/attilio.pregnolato.EGMSISTEMI/.claude/hooks/hook-event.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /c/Users/attilio.pregnolato.EGMSISTEMI/.claude/hooks/hook-event.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /c/Users/attilio.pregnolato.EGMSISTEMI/.claude/hooks/hook-event.sh"
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash /c/Users/attilio.pregnolato.EGMSISTEMI/.claude/hooks/hook-event.sh"
          }
        ]
      }
    ]
  }
}
```

⚠️ Preserve all existing keys — only ADD the `hooks` key. Do not remove `model`, `statusLine`, `enabledPlugins`, etc.

- [ ] **Step 5: Commit**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
git add docs/
git commit -m "chore: task 1 — hook script + settings.json hooks config"
```

---

### Task 2: Environment variables

**Files:**
- Create: `backend/.env`
- Create: `backend/.env.example`
- Modify: `package.json` (root, lines 8-9)

- [ ] **Step 1: Create backend/.env**

```bash
# backend/.env — never committed (already in .gitignore root *.env pattern)
TELEGRAM_TOKEN=8725441191:AAGc9oSMECxnrXxoUDilnNLeqM-KlcgZP78
TELEGRAM_CHAT_ID=181756177
```

⚠️ Verify `.gitignore` already ignores `.env` — it does (root `.gitignore` line: `.env`). Still, confirm `backend/.env` won't be committed:

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
git check-ignore -v backend/.env
```

Expected: `backend/.env` is shown as ignored.

- [ ] **Step 2: Create backend/.env.example**

```
TELEGRAM_TOKEN=
TELEGRAM_CHAT_ID=
```

- [ ] **Step 3: Update package.json start scripts**

In `package.json` (root), change lines 8–9:

Old:
```json
"dev:backend": "cd backend && node server.js",
...
"start:backend": "cd backend && node server.js",
```

New:
```json
"dev:backend": "cd backend && node --env-file=.env server.js",
...
"start:backend": "cd backend && node --env-file=.env server.js",
```

- [ ] **Step 4: Verify env loads**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode/backend"
node --env-file=.env -e "console.log('TOKEN:', process.env.TELEGRAM_TOKEN?.slice(0,10))"
```

Expected output: `TOKEN: 8725441191` (first 10 chars)

- [ ] **Step 5: Commit**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
git add backend/.env.example package.json
git commit -m "chore: task 2 — env vars setup, --env-file in start scripts"
```

---

### Task 3: telegram.js

**Files:**
- Create: `backend/telegram.js`

- [ ] **Step 1: Create backend/telegram.js**

```js
// backend/telegram.js
// Uses Node 18+ native fetch — no extra dependency needed

const BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

/**
 * Send a text message to the configured Telegram chat.
 * No-ops silently if TELEGRAM_TOKEN or TELEGRAM_CHAT_ID are not set.
 */
export async function sendTelegram(text) {
  if (!process.env.TELEGRAM_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    const res = await fetch(`${BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[telegram] API error:', res.status, body);
    }
  } catch (e) {
    console.error('[telegram] send failed:', e.message);
  }
}
```

- [ ] **Step 2: Test telegram.js manually**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode/backend"
node --env-file=.env -e "
import('./telegram.js').then(m => m.sendTelegram('🧪 Test da dashboard — telegram.js funziona!'))
"
```

Expected: Telegram message arrives on your phone within 5 seconds.

- [ ] **Step 3: Commit**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
git add backend/telegram.js
git commit -m "feat: task 3 — telegram.js helper with native fetch"
```

---

### Task 4: POST /api/hook-event in server.js

**Files:**
- Modify: `backend/server.js`

Claude Code sends these payloads per event type:

- **PreToolUse:** `{ hook_event_name, tool_name, tool_input, session_id, project_path }`
- **PostToolUse:** `{ hook_event_name, tool_name, tool_input, tool_response: { output, exit_code }, session_id, project_path }`
- **Notification:** `{ hook_event_name, message, session_id, project_path }`
- **Stop:** `{ hook_event_name, session_id, project_path, transcript_path }`

- [ ] **Step 1: Add telegram import to server.js**

At the top of `backend/server.js`, after the existing imports (around line 14), add:

```js
import { sendTelegram } from './telegram.js';
```

- [ ] **Step 2: Add POST /api/hook-event endpoint**

Add this block immediately before the `// ── Avvio` comment (before `server.listen`):

```js
// ── REST: Hook Events ────────────────────────────────
app.post('/api/hook-event', async (req, res) => {
  const body = req.body;
  if (!body || typeof body.hook_event_name !== 'string') {
    return res.status(400).json({ error: 'missing hook_event_name' });
  }

  const { hook_event_name, project_path = '', tool_name, tool_response, message } = body;

  // Derive project name: match against known projects, fallback to basename
  const projectName = (() => {
    const match = config.projects.find(p =>
      p.path && (p.path === project_path || path.basename(p.path) === path.basename(project_path))
    );
    return match?.name ?? path.basename(project_path) ?? 'Unknown';
  })();

  // Map hook event → status
  const statusMap = {
    PreToolUse: 'active',
    Notification: 'waiting',
    Stop: 'review'
  };
  const hookStatus = statusMap[hook_event_name];

  // Broadcast hook_status for PreToolUse, Notification, Stop
  if (hookStatus) {
    const wsMsg = JSON.stringify({
      type: 'hook_status',
      projectPath: project_path,
      projectName,
      status: hookStatus,
      timestamp: Date.now()
    });
    clients.forEach(c => { if (c.readyState === 1) c.send(wsMsg); });
  }

  // Telegram: notify on Stop
  if (hook_event_name === 'Stop') {
    await sendTelegram(`✅ <b>${projectName}</b> — sessione terminata`);
  }

  // Telegram: notify on Bash error (PostToolUse, exit_code !== 0)
  if (
    hook_event_name === 'PostToolUse' &&
    tool_name === 'Bash' &&
    tool_response?.exit_code !== undefined &&
    tool_response.exit_code !== 0
  ) {
    const cmd = body.tool_input?.command ?? '(sconosciuto)';
    const short = cmd.length > 80 ? cmd.slice(0, 80) + '…' : cmd;
    await sendTelegram(`💥 <b>${projectName}</b> — errore Bash (exit ${tool_response.exit_code})\n<code>${short}</code>`);
  }

  res.json({ ok: true });
});
```

- [ ] **Step 3: Verify server starts without errors**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
npm run dev:backend
```

Expected: server starts on port 3001 with no errors. Press Ctrl+C after verifying.

- [ ] **Step 4: Test PreToolUse event via curl**

Start the backend first (`npm run dev:backend` in a separate terminal), then:

```bash
curl -s -X POST http://localhost:3001/api/hook-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PreToolUse",
    "tool_name": "Bash",
    "tool_input": {"command": "npm test"},
    "session_id": "test-123",
    "project_path": "/c/Progetti Pilota/DashboardClaudeCode"
  }'
```

Expected response: `{"ok":true}`

- [ ] **Step 5: Test Stop event + Telegram**

```bash
curl -s -X POST http://localhost:3001/api/hook-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "Stop",
    "session_id": "test-123",
    "project_path": "/c/Progetti Pilota/DashboardClaudeCode"
  }'
```

Expected: `{"ok":true}` AND a Telegram message arrives: `✅ DashboardClaudeCode — sessione terminata`

- [ ] **Step 6: Test Bash error event + Telegram**

```bash
curl -s -X POST http://localhost:3001/api/hook-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PostToolUse",
    "tool_name": "Bash",
    "tool_input": {"command": "npm test -- --fail"},
    "tool_response": {"output": "FAIL", "exit_code": 1},
    "session_id": "test-123",
    "project_path": "/c/Progetti Pilota/DashboardClaudeCode"
  }'
```

Expected: `{"ok":true}` AND Telegram message: `💥 DashboardClaudeCode — errore Bash (exit 1)\nnpm test -- --fail`

- [ ] **Step 7: Commit**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
git add backend/server.js
git commit -m "feat: task 4 — POST /api/hook-event routes events to WS + Telegram"
```

---

### Task 5: useWebSocket.js — handle hook_status

**Files:**
- Modify: `frontend/src/hooks/useWebSocket.js`

- [ ] **Step 1: Add hookStatuses state**

In `useWebSocket.js`, after the existing state declarations (around line 10–12), add:

```js
const [hookStatuses, setHookStatuses] = useState({});
```

Full state block becomes:
```js
const [projects, setProjects] = useState([]);
const [projectStatuses, setProjectStatuses] = useState({});
const [hookStatuses, setHookStatuses] = useState({});
const [connectionStatus, setConnectionStatus] = useState('connecting');
```

- [ ] **Step 2: Handle hook_status message**

In `ws.onmessage`, after the `else if (message.type === 'status')` block, add:

```js
} else if (message.type === 'hook_status') {
  setHookStatuses(prev => ({
    ...prev,
    [message.projectPath]: {
      status: message.status,
      projectName: message.projectName,
      ts: message.timestamp
    }
  }));
}
```

The full onmessage handler after the change:
```js
ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);

    if (message.type === 'config') {
      console.log('📋 Ricevuta configurazione progetti:', message.projects);
      setProjects(message.projects);
    } else if (message.type === 'status') {
      console.log('📊 Aggiornamento status:', message.data.projectName);
      const projectName = message.data.projectName;
      const oldStatus = previousStatusesRef.current[projectName]?.status;
      const newStatus = message.data.status;
      previousStatusesRef.current[projectName] = message.data;
      setProjectStatuses((prev) => ({
        ...prev,
        [projectName]: message.data
      }));
    } else if (message.type === 'hook_status') {
      setHookStatuses(prev => ({
        ...prev,
        [message.projectPath]: {
          status: message.status,
          projectName: message.projectName,
          ts: message.timestamp
        }
      }));
    }
  } catch (error) {
    console.error('❌ Errore parsing messaggio:', error);
  }
};
```

- [ ] **Step 3: Return hookStatuses**

Change the return statement at the bottom of `useWebSocket`:

Old:
```js
return { projects, projectStatuses, connectionStatus };
```

New:
```js
return { projects, projectStatuses, hookStatuses, connectionStatus };
```

- [ ] **Step 4: Commit**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
git add frontend/src/hooks/useWebSocket.js
git commit -m "feat: task 5 — useWebSocket handles hook_status, exposes hookStatuses"
```

---

### Task 6: ProjectCard badge + Dashboard wiring

**Files:**
- Modify: `frontend/src/components/ProjectCard.jsx`
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Add hookStatus prop to ProjectCard**

In `frontend/src/components/ProjectCard.jsx`, find the function signature. It currently is:

```js
export default function ProjectCard({ project, status }) {
```

Change to:

```js
export default function ProjectCard({ project, status, hookStatus }) {
```

- [ ] **Step 2: Add HOOK_STATUS_STYLE constant**

After the existing `STATUS_STYLE` constant in ProjectCard.jsx, add:

```js
const HOOK_STATUS_STYLE = {
  active:  { color: '#00ff88', label: '⚡ HOOK ATTIVO' },
  waiting: { color: '#ffcc00', label: '⏳ IN ATTESA' },
  review:  { color: '#ff6b6b', label: '🔴 DA CONTROLLARE' },
};
```

- [ ] **Step 3: Render hook status badge in ProjectCard**

Find the ProjectCard JSX return. Locate the outermost wrapping `<div>` of the card. Add the hook badge as the **first child** inside that div, shown only when `hookStatus` exists and is not stale (within 30 minutes):

```js
{/* Hook status badge */}
{(() => {
  if (!hookStatus) return null;
  const ageMs = Date.now() - hookStatus.ts;
  if (ageMs > 30 * 60 * 1000) return null; // hide after 30 min
  const style = HOOK_STATUS_STYLE[hookStatus.status];
  if (!style) return null;
  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '0.6rem',
      color: style.color,
      border: `1px solid ${style.color}`,
      borderRadius: 3,
      padding: '2px 6px',
      marginBottom: 6,
      display: 'inline-block',
      letterSpacing: '0.05em'
    }}>
      {style.label}
    </div>
  );
})()}
```

- [ ] **Step 4: Wire hookStatuses in Dashboard.jsx**

In `frontend/src/pages/Dashboard.jsx`, line 70, destructure `hookStatuses`:

Old:
```js
const { projects, projectStatuses, connectionStatus } = useWebSocket();
```

New:
```js
const { projects, projectStatuses, hookStatuses, connectionStatus } = useWebSocket();
```

Then find all three `<ProjectCard>` occurrences (lines ~250, ~268, ~306) and add `hookStatus` prop to each:

Old (repeated 3 times):
```jsx
<ProjectCard key={p.name} project={p} status={projectStatuses[p.name]} />
```

New (repeated 3 times):
```jsx
<ProjectCard key={p.name} project={p} status={projectStatuses[p.name]} hookStatus={hookStatuses[p.path]} />
```

- [ ] **Step 5: Build and verify visually**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
npm run dev
```

Open browser at `http://localhost:5173`. Then in a second terminal, send a test hook event:

```bash
curl -s -X POST http://localhost:3001/api/hook-event \
  -H "Content-Type: application/json" \
  -d '{
    "hook_event_name": "PreToolUse",
    "tool_name": "Bash",
    "session_id": "test-123",
    "project_path": "/c/Progetti Pilota/DashboardClaudeCode"
  }'
```

Expected: a `⚡ HOOK ATTIVO` badge appears on the DashboardClaudeCode project card within 1 second.

Send a Stop event and verify `🔴 DA CONTROLLARE` badge appears + Telegram message arrives.

- [ ] **Step 6: Commit**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
git add frontend/src/components/ProjectCard.jsx frontend/src/pages/Dashboard.jsx
git commit -m "feat: task 6 — hook status badge on ProjectCard, Dashboard wiring"
```

---

### Task 7: End-to-end test with real Claude Code hook

**Files:** None (config already done in Task 1)

- [ ] **Step 1: Start the dashboard**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
npm run dev
```

- [ ] **Step 2: Open a new Claude Code session in a different project**

Open any project directory in a new terminal and run `claude`. The PreToolUse hook should fire when Claude uses any tool.

- [ ] **Step 3: Verify dashboard badge appears**

In the browser at `http://localhost:5173`, the project card for the active Claude session should show the `⚡ HOOK ATTIVO` badge within ~1 second of Claude using a tool.

- [ ] **Step 4: End the Claude session**

Type `/exit` or Ctrl+C in the Claude session. Verify:
- Dashboard shows `🔴 DA CONTROLLARE` badge
- Telegram message arrives: `✅ [ProjectName] — sessione terminata`

- [ ] **Step 5: Final commit + push**

```bash
cd "/c/Progetti Pilota/DashboardClaudeCode"
git add -A
git status  # verify nothing unexpected staged
git push origin main
```
