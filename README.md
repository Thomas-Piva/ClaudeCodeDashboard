<div align="center">

<img src="frontend/public/icona.png" alt="Claude Code Dashboard" width="280" />

# Dashboard Claude Code

**Monitoraggio in tempo reale + ricerca full-text + analytics per sessioni Claude Code**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.2.0-blue)](https://reactjs.org/)
[![Version](https://img.shields.io/badge/version-5.0.0-purple)](https://github.com/Attilio81/ClaudeCodeDashboard)

*Monitora N sessioni Claude Code parallele, cerca nei messaggi passati, analizza i pattern di utilizzo*

[Avvio Rapido](#-avvio-rapido) • [Funzionalità](#-funzionalità) • [Come Funziona](#-come-funziona) • [Scorciatoie](#-scorciatoie-tastiera) • [API](#-api-reference) • [Troubleshooting](#-troubleshooting)

</div>

---

## Funzionalità

### Monitoraggio in Tempo Reale

| Funzionalità | Descrizione |
|--------------|-------------|
| **Scan Roots** | Configura cartelle radice — tutte le sottocartelle con sessioni Claude vengono monitorate automaticamente (profondità 2) |
| **WebSocket live** | Aggiornamenti istantanei via WebSocket, riconnessione automatica ogni 3 secondi |
| **Discovery dinamico** | Nuovi progetti rilevati automaticamente senza riavvio del server |
| **Stato intelligente** | Attivo / Da Controllare / Inattivo / Errore in base al tipo di entry e ai timeout |

### Ricerca Full-Text — `Cmd+K`

- Premi `Ctrl+K` / `Cmd+K` ovunque per aprire la barra di ricerca globale
- Cerca in **tutti i messaggi** di tutte le sessioni indicizzate — istantaneo (SQLite FTS5)
- Risultati con **snippet evidenziato** e nome progetto
- Naviga i risultati con `↑↓`, apri con `↵`, chiudi con `Esc`

### Session Viewer — `/session/:id`

- Accedi a qualsiasi sessione passata dal pannello sessioni di ogni card
- Scorrimento messaggi con `j`/`k`, inverti ordine con `o`
- **Esporta** la sessione come file HTML autonomo (dark theme, offline-readable)

### Analytics — `/analytics`

- **Heatmap attività** stile GitHub — ultimi 365 giorni di messaggi
- **Tool usage** — top 10 tool più usati da Claude (bar chart orizzontale)
- **Breakdown per progetto** — sessioni, messaggi totali, ultima attività

### Gestione Progetti (per card)

| Azione | Descrizione |
|--------|-------------|
| **Sessioni** | Toggle ▶ per vedere le ultime 5 sessioni indicizzate del progetto |
| **Escludi ⊗** | Rimuove il progetto dal monitoraggio, persistito in `excluded-paths.json` |
| **Apri CMD** | Apre cmd.exe nella directory del progetto con titolo `claude - <nome>` |
| **Trova finestra** | Individua la tab di Windows Terminal della sessione tramite UIAutomation |
| **Porta in primo piano ⬆** | Porta Windows Terminal in primo piano e seleziona la tab corretta |
| **Segna controllato** | Marca un progetto "Da Controllare" come rivisto → torna a Inattivo |

### Area Admin

- Pannello accessibile con **⚙ ADMIN** nell'header
- Aggiungi / rimuovi cartelle radice di scansione
- **Riscansiona Ora** — trova nuovi progetti senza riavviare il server
- Ripristina percorsi esclusi

---

## Come Funziona

### Discovery: Scan Roots

1. Legge `backend/scan-paths.json` — lista cartelle radice configurate
2. Per ogni radice, scansiona le sottocartelle (profondità massima 2)
3. Controlla se esiste `~/.claude/projects/[path-codificato]/` con file `.jsonl`
4. Include solo le cartelle con sessioni reali

```
C:\Progetti Pilota\           ← cartella radice
├── DashboardClaudeCode\      ← ha sessioni Claude → MONITORATA
├── gestione-preattività\
│   └── consultation-panel\  ← ha sessioni Claude (2 livelli) → MONITORATA
└── Archivio\                 ← nessuna sessione → IGNORATA
```

### Indicizzazione SQLite

Al primo avvio e ad ogni modifica di un file sessione:

1. L'**indexer** legge il file `.jsonl` e ne estrae messaggi, tool call, timestamp
2. Scrive in `backend/agentsview.db` (SQLite con FTS5)
3. Il **watcher** re-indicizza in background (`setImmediate`) ad ogni cambio file
4. La ricerca full-text interroga la tabella FTS5 — risultati istantanei

### Codifica del percorso

Claude Code converte i path in nomi di directory:
```
C:\Progetti Pilota\MioProgetto  →  C--Progetti-Pilota-MioProgetto
```
I caratteri non-ASCII vengono codificati come uno o più `-` in base ai byte UTF-8.

### Rilevamento finestra terminale

1. Legge `~/.claude/sessions/*.json` — contengono `{ pid, cwd, sessionId }`
2. Risale la catena processi padre fino a Windows Terminal (max 6 livelli)
3. UIAutomation (`System.Windows.Automation`) enumera le tab
4. Il bottone ⬆ porta in primo piano via simulazione tasto ALT + `SelectionItemPattern`

### Stato intelligente

| Stato | Colore | Condizione |
|-------|--------|------------|
| **Attivo** | Verde | Tool in esecuzione o < 5 min dall'ultimo tool result |
| **Da Controllare** | Arancione | Completato da < 60 min |
| **Inattivo** | Grigio | > 60 min di inattività o segnato manualmente |
| **Errore** | Rosso | Impossibile leggere la sessione |

---

## Scorciatoie Tastiera

| Tasto | Dove | Azione |
|-------|------|--------|
| `Ctrl+K` / `Cmd+K` | Ovunque | Apri/chiudi ricerca globale |
| `Esc` | Ovunque | Chiudi modal / torna indietro |
| `↑` / `↓` | Ricerca | Naviga risultati |
| `↵` | Ricerca | Apri sessione selezionata |
| `j` / `k` | Session viewer | Messaggio successivo / precedente |
| `o` | Session viewer | Inverti ordine messaggi (vecchi → recenti) |

---

## Stack Tecnologico

| Layer | Tecnologie |
|-------|-----------|
| **Backend** | Node.js >= 18, Express, ws, chokidar, better-sqlite3 (FTS5) |
| **Frontend** | React 18.2, Vite 5, react-router-dom v7 |
| **Database** | SQLite 3 con FTS5 (full-text search, WAL mode) |
| **Font** | Syne (Google Fonts), JetBrains Mono |
| **Piattaforma** | Windows — PowerShell + UIAutomation per rilevamento terminale |

---

## Struttura Progetto

```
DashboardClaudeCode/
├── backend/
│   ├── server.js              # Express + WebSocket + API REST
│   ├── claude-watcher.js      # Monitora sessioni Claude Code in tempo reale
│   ├── db.js                  # SQLite layer (FTS5, schema, query helpers)
│   ├── indexer.js             # Parser JSONL → SQLite FTS5
│   ├── path-scanner.js        # Discovery da cartelle radice
│   ├── scan-paths.json        # Cartelle radice da scansionare
│   ├── excluded-paths.json    # Percorsi esclusi
│   ├── agentsview.db          # Database SQLite (creato al primo avvio, .gitignore)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Router shell (BrowserRouter)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Layout 3 colonne (Attivi/Check/Inattivi)
│   │   │   ├── Session.jsx            # Viewer sessione + export HTML
│   │   │   └── Analytics.jsx          # Heatmap + tool usage + breakdown
│   │   ├── components/
│   │   │   ├── ProjectCard.jsx        # Card progetto con azioni
│   │   │   ├── SessionList.jsx        # Lista sessioni inline per card
│   │   │   ├── SearchBar.jsx          # Modal ricerca Cmd+K
│   │   │   └── AdminPanel.jsx         # Pannello configurazione
│   │   ├── hooks/
│   │   │   └── useWebSocket.js        # Hook WebSocket + riconnessione
│   │   └── index.css                  # Variabili CSS + animazioni
│   ├── index.html
│   └── package.json
├── docs/
│   └── superpowers/
│       ├── specs/                     # Design document
│       └── plans/                     # Implementation plan
├── start.bat                  # Avvio rapido Windows
├── package.json
└── README.md
```

---

## Avvio Rapido

### Prerequisiti

```
Node.js >= 18
npm >= 9
Windows (per UIAutomation terminal detection)
Claude Code con sessioni attive
```

### Installazione

```bash
# 1. Clona il repository
git clone https://github.com/Attilio81/ClaudeCodeDashboard.git
cd ClaudeCodeDashboard

# 2. Installa le dipendenze
npm install
cd backend && npm install
cd ../frontend && npm install && cd ..

# 3. Avvia
npm run dev
# oppure su Windows: doppio click su start.bat
```

Apri `http://localhost:5173`

Al primo avvio, il backend indicizza automaticamente tutte le sessioni esistenti in `~/.claude/projects/`.

---

## Configurazione

### Cartelle radice (`backend/scan-paths.json`)

```json
[
  "C:\\BIZ2017",
  "C:\\Progetti Pilota",
  "C:\\ProgettiEgm"
]
```

Puoi anche usare l'**Area Admin** nell'interfaccia per aggiungere o rimuovere percorsi.

### Percorsi esclusi (`backend/excluded-paths.json`)

Popolato automaticamente con il bottone **⊗** su ogni card. Per ripristinare: Admin → sezione "Percorsi esclusi".

### Fallback: `backend/config.json`

Se `scan-paths.json` è vuoto, il server usa `config.json` con lista manuale:

```json
{
  "projects": [
    { "name": "MioProgetto", "path": "C:\\Progetti\\MioProgetto" }
  ]
}
```

---

## API Reference

### Monitoraggio Progetti (WebSocket)

**Endpoint:** `ws://localhost:3001`

**Config** (alla connessione e ad ogni aggiornamento lista):
```json
{ "type": "config", "projects": [{ "name": "BNEGS076", "path": "C:\\..." }] }
```

**Status update** (ad ogni cambio sessione):
```json
{
  "type": "status",
  "data": {
    "status": "active", "projectName": "BNEGS076",
    "lastUpdate": "2026-04-13T10:00:00Z", "lastOutput": "Bash: npm test",
    "slug": "sharded-wibbling-crab", "gitBranch": "main",
    "sessionId": "abc-123",
    "outputHistory": [{ "timestamp": "...", "output": "...", "toolName": "Bash" }]
  }
}
```

### REST API

#### Progetti

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/health` | Stato server |
| `GET` | `/api/projects` | Lista progetti monitorati |
| `POST` | `/api/projects/:name/mark-checked` | Segna come controllato |
| `POST` | `/api/projects/:name/exclude` | Escludi dal monitoraggio |
| `POST` | `/api/projects/:name/open-terminal` | Apri CMD nella directory |
| `GET` | `/api/projects/:name/terminal-windows` | Trova le tab del terminale |
| `POST` | `/api/focus-window/:pid` | Porta finestra in primo piano |

#### Sessioni & Ricerca

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/sessions?project=X&limit=20&offset=0` | Lista sessioni indicizzate |
| `GET` | `/api/sessions/:id` | Sessione + messaggi (paginati) |
| `GET` | `/api/sessions/:id/messages?limit=50&offset=0` | Solo messaggi |
| `GET` | `/api/sessions/:id/export` | Download sessione come HTML |
| `GET` | `/api/search?q=testo&limit=20` | Ricerca full-text FTS5 |
| `GET` | `/api/analytics` | Heatmap + tool usage + breakdown |

#### Admin

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/admin/scan-paths` | Lista cartelle radice |
| `POST` | `/api/admin/scan-paths` | Aggiungi cartella (`{ "path": "C:\\..." }`) |
| `DELETE` | `/api/admin/scan-paths/:index` | Rimuovi cartella radice |
| `POST` | `/api/admin/rescan` | Riscansiona senza riavvio |
| `GET` | `/api/admin/excluded-paths` | Lista percorsi esclusi |
| `DELETE` | `/api/admin/excluded-paths/:index` | Ripristina percorso escluso |

---

## Troubleshooting

<details>
<summary><b>Porta 3001 già in uso (EADDRINUSE)</b></summary>

Un'altra istanza del server è già in esecuzione. Terminala prima di rilanciare:

```powershell
# Opzione 1 — termina tutti i processi Node
taskkill /f /im node.exe

# Opzione 2 — solo la porta 3001
npx kill-port 3001
```

</details>

<details>
<summary><b>Progetto non rilevato</b></summary>

Verifica che esista una directory sessione in `~/.claude/projects/`:

```powershell
ls "$env:USERPROFILE\.claude\projects\" | Where-Object Name -like "*NOMEPROGETTO*"
```

Se esiste ma non appare, controlla che il percorso sia in `scan-paths.json` e fai **Riscansiona** dal pannello Admin.

</details>

<details>
<summary><b>Ricerca non trova risultati attesi</b></summary>

Il database SQLite si popola all'avvio e ad ogni modifica delle sessioni. Se hai sessioni vecchie non ancora indicizzate, riavvia il server — la catch-up indexing le indicizza automaticamente.

Nota: caratteri speciali FTS5 (`"`, `+`, `-`, `*`) nella query possono causare risultati vuoti. Prova con termini semplici.

</details>

<details>
<summary><b>"Trova finestra" non trova nulla</b></summary>

La funzione richiede che:
1. Claude Code sia attivo (file in `~/.claude/sessions/` con `cwd` corrispondente)
2. Il processo sia figlio di Windows Terminal o cmd

Se non funziona, verifica i file in `~/.claude/sessions/*.json`.

</details>

<details>
<summary><b>Il bottone ⬆ non porta la finestra in primo piano</b></summary>

Windows blocca `SetForegroundWindow` dai processi in background. La dashboard usa il workaround del tasto ALT (`keybd_event`). Se non funziona, clicca prima sulla dashboard e poi su ⬆.

</details>

<details>
<summary><b>WebSocket si disconnette continuamente</b></summary>

Il client si riconnette ogni 3 secondi automaticamente. Se il problema persiste, verifica che il backend sia in esecuzione sulla porta 3001 e che non ci siano firewall locali.

</details>

---

## Changelog

### v5.0.0 (2026-04-13) — agentsview Integration: Search + Analytics + Session Viewer

- **Ricerca full-text `Ctrl+K`**: cerca in tutti i messaggi di tutte le sessioni — SQLite FTS5 con snippet evidenziato, navigazione tastiera (↑↓ / ↵ / Esc)
- **Session viewer** (`/session/:id`): leggi i messaggi di qualsiasi sessione passata, naviga con `j`/`k`, inverti ordine con `o`
- **Pannello sessioni** su ogni card: toggle ▶ mostra le ultime 5 sessioni indicizzate del progetto
- **Export HTML**: scarica qualsiasi sessione come file HTML standalone (dark theme, offline)
- **Analytics** (`/analytics`): heatmap attività (365 giorni), top 10 tool usage, breakdown per progetto
- **SQLite + FTS5**: nuovo layer `backend/db.js` + `backend/indexer.js` — indicizzazione automatica all'avvio e in tempo reale
- **React Router v7**: routing SPA con 3 route (`/`, `/analytics`, `/session/:id`)
- **Nav pills** floating: DASHBOARD / ANALYTICS / CERCA sempre accessibili

### v4.5.0 (2026-04-02) — Bugfix Batch
- **Fix path discovery**: codifica corretta caratteri non-ASCII (à, è, ecc.) su 2+ byte UTF-8
- **Fix config URL**: parametro `?v=` per evitare cache browser sul config
- **Fix PIDs cleanup**: pulizia automatica `terminal-pids.json` dei processi terminati
- **Fix tail read**: lettura corretta degli ultimi byte dei file JSONL
- **Fix inline confirm**: conferma esclusione visibile nel modal
- **Rate limit** su Riscansiona: debounce 2 secondi

### v4.4.0 (2026-04-02) — Ricerca Inattivi + Fix Excluded Paths
- Barra di ricerca nella colonna Inattivi — filtra card per nome in tempo reale
- Fix `excluded-paths.json`: username Windows con punti nel percorso

### v4.3.0 (2026-04-02) — PID Tracking + Dynamic Session Re-watch
- Apri CMD: salva PID, titolo finestra `claude - <nome>`
- Trova finestra: priorità match PID dashboard (badge viola)
- claude-watcher: periodic check aggiorna watcher su nuove sessioni

### v4.2.0 (2026-04-02) — Slug-based Tab Filtering
- Trova finestra: match tab tramite slug sessione Claude
- Badge tipo match (slug / titolo / pid)

### v4.1.0 (2026-04-02) — UIAutomation Tab Detection
- Trova finestra via `~/.claude/sessions/*.json` + UIAutomation
- Porta in primo piano: workaround ALT-key + SelectionItemPattern
- Fix: script PowerShell su file temporaneo (limite 8191 char)
- Fix: codifica percorsi non-ASCII

### v4.0.0 (2026-04-02) — Scan Roots + Terminal Noir UI
- Discovery da cartelle radice configurabili
- Area Admin per gestire percorsi
- Trova finestra terminale (prima implementazione)
- Dark theme completo — Syne + JetBrains Mono

### v3.0.0 → v1.0.0
- v3.0: Auto-discovery dinamico, timeout intelligenti, storico sessione
- v2.0: Parsing file `.jsonl` in tempo reale
- v1.0: Monitoraggio via `status.json`, WebSocket + UI

---

<div align="center">

**[Segnala un Bug](https://github.com/Attilio81/ClaudeCodeDashboard/issues)** • **[Richiedi una Funzionalità](https://github.com/Attilio81/ClaudeCodeDashboard/issues)**

Made with Claude Code

</div>
