<div align="center">

# 🚀 Dashboard Claude Code

**Real-time monitoring dashboard for multiple Claude Code sessions**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.2.0-blue)](https://reactjs.org/)
[![Status](https://img.shields.io/badge/status-active-success)](https://github.com)

*Monitora in tempo reale N sessioni Claude Code parallele su progetti diversi senza alcuna configurazione manuale*

[Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation) • [Troubleshooting](#-troubleshooting)

</div>

---

## ✨ Features

### 🎯 Core Features
- **🔍 Dynamic Auto-Discovery** - Rileva automaticamente nuovi progetti senza riavvio
- **⚡ Real-Time Monitoring** - Aggiornamenti istantanei via WebSocket
- **🤖 Zero Configuration** - Nessun file di configurazione da creare manualmente
- **📊 Smart Status Detection** - Riconosce attività, completamento e idle
- **🔄 Auto-Reconnect** - Riconnessione automatica in caso di disconnessione
- **🎨 Modern UI** - Interfaccia responsiva con Tailwind CSS

### � Advanced Features
- **Dynamic Project Detection** - Nuovi progetti aggiunti automaticamente durante l'esecuzione
- **Intelligent Timeouts** - 5 minuti per tool execution, 60 minuti per idle
- **Session History** - Storico completo degli ultimi 20 eventi per progetto
- **Git Branch Tracking** - Visualizza il branch attivo per ogni sessione
- **Tool Result Tracking** - Mantiene lo stato attivo durante l'esecuzione di tool lunghi
- **Manual Check Marking** - Segna manualmente progetti come controllati

## 🔬 Come Funziona

La dashboard monitora **automaticamente** le sessioni Claude Code attraverso un sistema intelligente di file watching:

### 📂 Struttura File
```
~/.claude/projects/
├── C--BIZ2017-BNRG0022/
│   ├── session-uuid-1.jsonl  ← Sessione attiva
│   └── session-uuid-2.jsonl
├── C--BIZ2017-BNEG0013/
│   └── session-uuid.jsonl    ← Rilevata automaticamente!
└── C--Progetti-Pilota-Dashboard/
    └── session-uuid.jsonl
```

### ⚙️ Flusso di Lavoro

1. **🔍 Discovery Phase** (all'avvio)
   - Scansiona `~/.claude/projects/` per progetti esistenti
   - Identifica file `.jsonl` più recenti per ogni progetto
   - Inizializza watcher per ogni sessione attiva

2. **📡 Real-Time Monitoring** (durante l'esecuzione)
   - Monitora modifiche ai file `.jsonl` con `chokidar`
   - Rileva nuove directory progetto create da Claude Code
   - Aggiunge automaticamente nuovi progetti senza riavvio

3. **🧠 Intelligent Status Detection**
   - **Active** (🟢): Tool in esecuzione o < 5 min dall'ultimo tool result
   - **Check** (🟡): Completato da < 60 minuti, da controllare
   - **Idle** (⚪): Inattivo da > 60 minuti o controllato manualmente
   - **Error** (🔴): Errore nella lettura della sessione

4. **📤 WebSocket Broadcast**
   - Invia aggiornamenti in tempo reale a tutti i client connessi
   - Include storico eventi, branch git, e metadata sessione

## 🛠️ Stack Tecnologico

<table>
<tr>
<td width="50%">

### Backend
- **Runtime**: Node.js >= 18
- **Framework**: Express.js
- **WebSocket**: ws
- **File Watching**: chokidar
- **Session Parsing**: Custom JSONL parser
- **CORS**: Enabled for local development

</td>
<td width="50%">

### Frontend
- **Framework**: React 18.2
- **Build Tool**: Vite 5.x
- **Styling**: Tailwind CSS 3.x
- **State**: React Hooks
- **WebSocket**: Native WebSocket API
- **Auto-reconnect**: Custom implementation

</td>
</tr>
</table>

## Struttura Progetto

```
dashboard/
├── backend/
│   ├── server.js          # Express + WebSocket server
│   ├── claude-watcher.js  # Monitora sessioni Claude Code REALI
│   ├── watcher.js         # Fallback: file .claude/status.json
│   ├── simulator.js       # Simulatore per testing
│   ├── config.json        # Configurazione progetti
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Componente principale
│   │   ├── components/
│   │   │   └── ProjectCard.jsx        # Card singolo progetto
│   │   ├── hooks/
│   │   │   └── useWebSocket.js        # Hook WebSocket
│   │   ├── index.css                  # Tailwind CSS
│   │   └── main.jsx                   # Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── update-status.js       # Script helper per aggiornamenti manuali
├── package.json           # Root package.json
├── README.md
└── QUICKSTART.md
```

## 🚀 Quick Start

### Prerequisites

```bash
# Required
Node.js >= 18
npm >= 9

# Optional but recommended
Claude Code installed with active sessions
```

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Attilio81/ClaudeCodeDashboard.git
cd ClaudeCodeDashboard

# 2. Install all dependencies (root, backend, frontend)
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# 3. Start the dashboard
npm run dev
```

🎉 La dashboard si aprirà automaticamente su `http://localhost:5173`

## ⚙️ Configuration

### Option 1: Auto-Discovery (Recommended) ✨

**Nessuna configurazione richiesta!** Il sistema rileva automaticamente tutti i progetti con sessioni Claude Code attive.

```bash
# Auto-discovery è abilitato di default
npm run dev
```

### Option 2: Manual Configuration (Optional)

Per aggiungere progetti specifici o disabilitare auto-discovery:

**1. Crea `backend/config.json`:**
```json
{
  "projects": [
    {
      "name": "MyProject",
      "path": "C:\\Projects\\MyProject"
    },
    {
      "name": "AnotherProject",
      "path": "/home/user/projects/another"
    }
  ]
}
```

**2. Disabilita auto-discovery (se necessario):**
```bash
AUTO_DISCOVERY=false npm run dev:backend
```

> **💡 Tip**: Con auto-discovery attivo, i progetti in `config.json` vengono comunque aggiunti e uniti con quelli rilevati automaticamente.

### Environment Variables

```bash
# Auto-discovery (default: true)
AUTO_DISCOVERY=true

# Real sessions monitoring (default: true)
USE_REAL_SESSIONS=true

# Backend port (default: 3001)
PORT=3001
```

## 📖 Usage

### Available Scripts

```bash
# Development
npm run dev              # Start backend + frontend (recommended)
npm run dev:backend      # Start only backend
npm run dev:frontend     # Start only frontend

# Testing
npm run simulate         # Start session simulator for testing

# Production
npm run build            # Build frontend for production
```

### Monitoring Modes

#### 🎯 Real Sessions (Default)

Monitora sessioni Claude Code reali:
```bash
npm run dev
```

**Features:**
- ✅ Zero configuration
- ✅ Dynamic project detection
- ✅ Real tool execution tracking
- ✅ Session history (last 20 events)
- ✅ Git branch tracking

#### 📝 Legacy Mode (status.json)

Per compatibilità con sistemi legacy:
```bash
USE_REAL_SESSIONS=false npm run dev:backend
```

### Testing Without Active Sessions

Usa il simulatore per generare dati di test:

```bash
# Terminal 1: Start simulator
npm run simulate

# Terminal 2: Start dashboard
npm run dev
```

Il simulatore genera attività casuali ogni 5 secondi.

## 📊 Dashboard Overview

### Status Indicators

| Icon | Status | Description | Trigger |
|------|--------|-------------|----------|
| 🟢 | **Active** | Claude is actively working | Tool execution or < 5 min from tool result |
| 🟡 | **Check** | Work completed, needs review | Completed < 60 minutes ago |
| ⚪ | **Idle** | No recent activity | Inactive > 60 minutes or manually checked |
| 🔴 | **Error** | Session read error | Cannot parse session file |

### Project Card Layout

```
┌──────────────────────────────────────────┐
│ 🟢 BNEG0013 [sharded-wibbling-crab]   │  ← Status + Project + Session Slug
├──────────────────────────────────────────┤
│ C:\BIZ2017\BNEG0013                    │  ← Project Path
│ 🌿 main                              │  ← Git Branch (if available)
│                                          │
│ Last Update: 22/01/2026, 14:00:15      │  ← Session Timestamp
│                                          │
│ Activity:                               │
│ Bash: npm test --coverage              │  ← Current Activity
│                                          │
│ History: 12 events                     │  ← Event Count
│ Received: 22/01/2026, 14:00:16         │  ← Dashboard Update Time
└──────────────────────────────────────────┘
```

### Activity Messages

| Message | Meaning |
|---------|----------|
| `Bash: <command>` | Shell command executed |
| `Read: <file>` | File read operation |
| `Write: <file>` | New file created |
| `Edit: <description>` | File edited |
| `Tool execution completed` | Tool finished executing |
| `Responding` | Claude is writing a response |
| `✅ Completato - Da controllare` | Work finished, needs review |
| `💤 Inattivo da più di 60 minuti` | Session idle |
| `✓ Controllato manualmente` | Manually marked as checked |

## 📝 Claude Code Session Format

Claude Code salva le sessioni in formato **JSONL** (JSON Lines) in `~/.claude/projects/`:

### Session File Structure

```jsonl
{"type":"user","message":{"content":"create a file"},"timestamp":"2026-01-22T11:00:00Z","sessionId":"abc-123"}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{"file_path":"test.js"}}]},"timestamp":"2026-01-22T11:00:01Z"}
{"type":"user","toolUseResult":{"stdout":"File created"},"timestamp":"2026-01-22T11:00:02Z"}
{"type":"assistant","message":{"content":[{"type":"text","text":"File created successfully"}]},"timestamp":"2026-01-22T11:00:03Z"}
```

### Entry Types

| Type | Field | Description |
|------|-------|-------------|
| `user` | `message.content` | User's request |
| `assistant` | `message.content[].tool_use` | Claude calling a tool |
| `user` | `toolUseResult` | Result of tool execution |
| `assistant` | `message.content[].text` | Claude's text response |

### Status Detection Logic

```javascript
// Active: Tool use or recent tool result
if (hasToolUse && diffMinutes < 5) return 'active';
if (toolResult && diffMinutes < 5) return 'active';

// Check: Completed recently
if (diffMinutes < 60) return 'check';

// Idle: No activity for a while
return 'idle';
```

## 🔌 API Reference

### HTTP REST Endpoints

#### Health Check
```http
GET http://localhost:3001/api/health
```
**Response:**
```json
{
  "status": "ok",
  "projects": 20
}
```

#### List Projects
```http
GET http://localhost:3001/api/projects
```
**Response:**
```json
[
  {"name": "BNEG0013", "path": "C:\\BIZ2017\\BNEG0013"},
  {"name": "MyProject", "path": "C:\\Projects\\MyProject"}
]
```

#### Mark Project as Checked
```http
POST http://localhost:3001/api/projects/:projectName/mark-checked
```
**Response:**
```json
{
  "success": true,
  "projectName": "BNEG0013",
  "message": "Progetto segnato come controllato"
}
```

### WebSocket API

**Connection:** `ws://localhost:3001`

#### Messages Received

**1. Configuration**
```json
{
  "type": "config",
  "projects": [
    {"name": "Project1", "path": "C:\\path"}
  ]
}
```

**2. Status Update**
```json
{
  "type": "status",
  "data": {
    "status": "active",
    "lastUpdate": "2026-01-22T12:30:00Z",
    "lastOutput": "Bash: npm install",
    "fullText": "Full response text...",
    "projectName": "Project1",
    "projectPath": "C:\\path",
    "timestamp": "2026-01-22T12:30:01Z",
    "sessionId": "abc-123",
    "slug": "sharded-wibbling-crab",
    "gitBranch": "main",
    "toolName": "Bash",
    "outputHistory": [
      {"timestamp": "...", "output": "...", "toolName": "..."}
    ]
  }
}
```


## 🔧 Troubleshooting

### Common Issues

<details>
<summary><b>⚠️ "Nessuna sessione attiva trovata"</b></summary>

**Causa:** Il progetto non ha mai avuto una sessione Claude Code attiva.

**Soluzione:**
1. Apri Claude Code nella directory del progetto
2. Esegui almeno un comando/richiesta
3. Il file `.jsonl` verrà creato automaticamente in `~/.claude/projects/`
4. La dashboard rileverà il nuovo progetto entro 2 secondi

</details>

<details>
<summary><b>🔄 Progetti non aggiornati in real-time</b></summary>

**Verifica:**
1. Claude Code è effettivamente attivo sul progetto?
2. Il path in `config.json` corrisponde esattamente? (case-sensitive)
3. Controlla i log del backend per errori di permessi
4. Verifica che `chokidar` possa accedere alla directory

**Debug:**
```bash
# Controlla se il file sessione esiste
ls ~/.claude/projects/C--BIZ2017-BNEG0013/

# Verifica permessi
ls -la ~/.claude/projects/
```

</details>

<details>
<summary><b>🔌 WebSocket keeps disconnecting</b></summary>

**Possibili cause:**
- Firewall blocca la porta 3001
- Backend non in esecuzione
- Conflitto di porta

**Soluzione:**
```bash
# Verifica che il backend sia in esecuzione
ps aux | grep node

# Controlla se la porta è occupata
netstat -an | grep 3001

# Controlla i log del backend
tail -f backend.log
```

> Il frontend riconnette automaticamente ogni 3 secondi.

</details>

<details>
<summary><b>🆕 Nuovo progetto non rilevato</b></summary>

**Con Auto-Discovery:**
- Il rilevamento avviene entro 2 secondi dalla creazione del file `.jsonl`
- Controlla che il file esista: `ls ~/.claude/projects/*/`
- Verifica i log del backend per errori

**Senza Auto-Discovery:**
- Aggiungi il progetto a `backend/config.json`
- Riavvia il backend: `npm run dev:backend`

</details>

<details>
<summary><b>🐛 Status sempre "Check" invece di "Active"</b></summary>

**Causa:** Timeout di 5 minuti non rispettato dopo tool result.

**Verifica versione:** Assicurati di avere l'ultima versione con la correzione del timeout.

**Workaround temporaneo:** Riavvia il backend.

</details>

### Port Configuration

| Service | Default Port | Config File |
|---------|--------------|-------------|
| Backend HTTP | 3001 | `backend/server.js` |
| WebSocket | 3001 | `backend/server.js` |
| Frontend Dev | 5173 | `frontend/vite.config.js` |
| WebSocket Client | 3001 | `frontend/src/hooks/useWebSocket.js` |

## 👨‍💻 Development

### Project Structure

```
src/
├── backend/
│   ├── server.js              # Main server + WebSocket
│   ├── claude-watcher.js      # Real sessions watcher (MAIN)
│   ├── auto-discovery.js      # Auto-discovery logic
│   ├── watcher.js             # Legacy status.json watcher
│   └── simulator.js           # Testing simulator
├── frontend/
│   └── src/
│       ├── App.jsx            # Main component
│       ├── components/
│       │   └── ProjectCard.jsx # Status card
│       └── hooks/
│           └── useWebSocket.js # WS connection hook
└── docs/
    ├── README.md
    └── QUICKSTART.md
```

### Customization Examples

#### Modify Activity Timeouts

`backend/claude-watcher.js:228-261`

```javascript
// Active threshold (default: 5 minutes)
if (diffMinutes < 5) return 'active';

// Check threshold (default: 60 minutes)
if (diffMinutes < 60) return 'check';

// Idle threshold
return 'idle';
```

#### Add Custom Activity Parsing

`backend/claude-watcher.js:125-185`

```javascript
extractActivityInfo(sessionData) {
  // Add custom tool detection
  if (toolUse.name === 'CustomTool') {
    info.lastOutput = `Custom: ${toolUse.input.description}`;
    info.toolName = 'CustomTool';
  }
  return info;
}
```

#### Change WebSocket Port

**Backend:** `backend/server.js:16`
```javascript
const PORT = 3001; // Change this
```

**Frontend:** `frontend/src/hooks/useWebSocket.js:3`
```javascript
const WS_URL = 'ws://localhost:3001'; // Match backend
```

### Adding New Features

1. **Fork** the repository
2. Create a **feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

### Testing

```bash
# Unit tests (when available)
npm test

# Manual testing with simulator
npm run simulate

# Test auto-discovery
# 1. Start dashboard
npm run dev
# 2. Open a new Claude Code session in a project
# 3. Verify it appears within 2 seconds
```

## 🔒 Security & Privacy

- ✅ **Local-only**: Nessun dato inviato a server esterni
- ✅ **Localhost**: WebSocket accessibile solo su `127.0.0.1`
- ✅ **Read-only**: La dashboard legge solo file di sessione, non li modifica
- ⚠️ **Privacy**: I file `.jsonl` contengono conversazioni complete - attenzione in ambienti condivisi

## 📜 License

```
MIT License

Copyright (c) 2026 Dashboard Claude Code Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

Vedi [LICENSE](LICENSE) per il testo completo.

## 👥 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🚀 Roadmap

- [ ] **Multi-user support** - Track sessions from multiple developers
- [ ] **Performance metrics** - Track tool execution times
- [ ] **Session replay** - Replay session history step-by-step
- [ ] **Export/Import** - Export session data to JSON/CSV
- [ ] **Custom alerts** - Configure custom notification rules
- [ ] **Dark mode** - Theme customization
- [ ] **Docker support** - Containerized deployment

## 📦 Release Notes

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## 📊 Changelog

### v3.0.0 (2026-01-22) - Dynamic Discovery
- 🆕 **NEW**: Dynamic auto-discovery - nuovi progetti rilevati senza riavvio
- ⚡ **IMPROVED**: Intelligent timeout logic (5 min tool, 60 min idle)
- 🐛 **FIXED**: Path conversion bug (C:\ → C-- instead of C---)
- 🐛 **FIXED**: Premature "Check" status after tool execution
- 🔔 **REMOVED**: Browser notifications (can be re-enabled)
- 📊 **ENHANCED**: Session history tracking (last 20 events)
- 🌿 **ADDED**: Git branch display
- ✓️ **ADDED**: Manual check marking via API

### v2.0.0 (2026-01-15) - Real Sessions
- ✨ Monitoraggio automatico sessioni Claude Code reali
- 📊 Parsing file `.jsonl` in tempo reale
- 🔍 Auto-detection directory sessioni (statico)
- 🎯 Visualizzazione tool e comandi reali
- ⚡ Threshold attività configurabile

### v1.0.0 (2026-01-01) - Initial Release
- 🚀 Release iniziale
- 📝 Monitoraggio file `.claude/status.json`
- 🎨 UI con Tailwind CSS
- 🔌 WebSocket real-time

---

<div align="center">

### 🌟 Built with passion for the Claude Code community

**[Report Bug](https://github.com/Attilio81/ClaudeCodeDashboard/issues)** • **[Request Feature](https://github.com/Attilio81/ClaudeCodeDashboard/issues)** • **[Documentation](https://github.com/Attilio81/ClaudeCodeDashboard/wiki)**

Made with ❤️ by developers, for developers

</div>
