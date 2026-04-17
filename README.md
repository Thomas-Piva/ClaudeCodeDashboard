<div align="center">

<img src="frontend/public/icona.png" alt="Claude Code Dashboard" width="280" />

# Dashboard Claude Code

**Monitoraggio in tempo reale · Ricerca full-text · Analytics · Notifiche Telegram**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.2.0-blue)](https://reactjs.org/)
[![Version](https://img.shields.io/badge/version-6.0.0-purple)](https://github.com/Attilio81/ClaudeCodeDashboard)

*Monitora N sessioni Claude Code parallele, cerca nei messaggi passati, analizza i pattern di utilizzo, ricevi notifiche push su Telegram*

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
| **Hook status push** | Stato aggiornato in tempo reale via Claude Code hooks — nessun polling, evento immediato |
| **Stato intelligente** | Attivo / Da Controllare / Inattivo in base a hook events + file watcher con timeout |

### Notifiche Telegram

Il bot **ClaudeOps** invia notifiche push direttamente su Telegram:

| Evento | Notifica |
|--------|----------|
| Sessione terminata (`Stop`) | `✅ <progetto> — sessione terminata` |
| Errore Bash (`PostToolUse`, exit ≠ 0) | `💥 <progetto> — errore Bash (exit N)` + comando |

Configurazione opzionale tramite `backend/.env` — nessuna dipendenza aggiuntiva (Node 18+ native fetch).

### Ricerca Full-Text — `Ctrl+K`

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
| **Segna controllato** | Marca un progetto "Da Controllare" come rivisto → torna a Inattivo (funziona anche da hook status) |

### Area Admin

- Pannello accessibile con **⚙ ADMIN** nell'header
- Aggiungi / rimuovi cartelle radice di scansione
- **Riscansiona Ora** — trova nuovi progetti senza riavviare il server
- Ripristina percorsi esclusi
- **Wiki EGM** — configura cartella Obsidian e lancia la generazione wiki

### Wiki EGM (Knowledge Base automatica)

La dashboard può generare una wiki Markdown navigabile con Obsidian dalle sessioni indicizzate:

- **`backend/wiki-backfill.js`** — scansiona tutto il DB SQLite, raggruppa sessioni per progetto e chiama DeepSeek V3 per estrarre conoscenza tecnica in pagine Markdown
- **`backend/wiki-ingest.js`** — modulo incrementale: si aggancia all'indexer e aggiorna la wiki ad ogni nuova sessione indicizzata

Le pagine vengono scritte in una cartella configurabile compatibile con Obsidian (`[[wikilinks]]`, tabelle, blocchi codice).

Tutta la struttura è parametrizzata in **`backend/wiki-settings.json`** — nessun codice da modificare per adattarlo a un progetto diverso:

```json
{
  "wikiPath": "C:\\MyWiki",
  "categories": [
    { "name": "backend", "label": "Backend", "match": ["BackendProject", "API"] },
    { "name": "frontend", "label": "Frontend", "match": ["FrontendApp"] }
  ],
  "defaultCategory": "generale",
  "sessionFilter": ["BackendProject", "FrontendApp"],
  "excludeFilter": ["observer", "Dashboard"],
  "systemPrompt": "Sei un agente di estrazione della conoscenza..."
}
```

| Campo | Descrizione |
|-------|-------------|
| `wikiPath` | Cartella Obsidian di destinazione |
| `categories` | Sottocartelle wiki con pattern di match sui nomi progetto |
| `defaultCategory` | Categoria di fallback se nessun pattern combacia |
| `sessionFilter` | Pattern per includere sessioni nel backfill |
| `excludeFilter` | Pattern per escludere sessioni (es. observer, dashboard) |
| `systemPrompt` | Prompt personalizzato per il modello — adattabile al dominio |
| `provider` | Configurazione LLM: `baseURL`, `model`, `apiKeyEnv` |

**Provider LLM supportati** (tutti OpenAI-compatibili):

| Provider | `baseURL` | `model` | `apiKeyEnv` |
|----------|-----------|---------|-------------|
| DeepSeek V3 | `https://api.deepseek.com` | `deepseek-chat` | `DEEPSEEK_API_KEY` |
| LM Studio | `http://localhost:1234/v1` | nome modello caricato | — |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o`, `gpt-4o-mini` | `OPENAI_API_KEY` |
| Ollama | `http://localhost:11434/v1` | `llama3`, `mistral`, … | — |

Dall'**Admin → Wiki EGM → Provider LLM**: preset con un click + campi manuali per URL server, modello e variabile env della key. Tutto senza toccare codice.

**Avvio backfill manuale:**

```bash
node --env-file=.env backend/wiki-backfill.js
```

Oppure dal pannello **Admin → Wiki EGM → GENERA WIKI DA SESSIONI**.

---

## Come Funziona

### Claude Code Hooks

La dashboard si integra con il sistema di hooks di Claude Code a livello utente — gli hook si attivano per **tutti** i progetti Claude Code sulla macchina, non solo per questo.

```
~/.claude/settings.json          ← hook registrati a livello utente
~/.claude/hooks/hook-event.sh    ← script che POST-a il payload al backend
```

Ad ogni evento (PreToolUse, PostToolUse, Stop, Notification), Claude Code esegue lo script che invia il payload JSON al backend su `POST /api/hook-event`.

Il backend:
1. Legge il campo `cwd` (path del progetto corrente)
2. Risolve il nome progetto dalla configurazione
3. Broadcasts via WebSocket il nuovo status ai client connessi
4. Invia notifica Telegram se applicabile

**Mappa eventi → stato:**

| Hook event | Status dashboard | Colonna |
|------------|-----------------|---------|
| `PreToolUse` | `active` | Attivi |
| `Notification` | `waiting` | Da Controllare |
| `Stop` | `review` | Da Controllare |

Lo stato hook ha priorità sul file watcher per 30 minuti. Dopo 30 minuti senza nuovi eventi, il watcher torna a fare da fonte di verità.

### Discovery: Scan Roots

1. Legge `backend/scan-paths.json` — lista cartelle radice configurate
2. Per ogni radice, scansiona le sottocartelle (profondità massima 2)
3. Controlla se esiste `~/.claude/projects/[path-codificato]/` con file `.jsonl`
4. Include solo le cartelle con sessioni reali

```
C:\Work\           ← cartella radice
├── ProjectA\      ← ha sessioni Claude → MONITORATA
├── ProjectB\
│   └── module\   ← ha sessioni Claude (2 livelli) → MONITORATA
└── Archive\       ← nessuna sessione → IGNORATA
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
C:\Work\MyProject  →  C--Work-MyProject
```
I caratteri non-ASCII vengono codificati come uno o più `-` in base ai byte UTF-8.

### Stato intelligente

| Stato | Colore | Sorgente | Condizione |
|-------|--------|----------|------------|
| **Attivo** | Verde | Hook / Watcher | Hook `PreToolUse` — oppure — tool in esecuzione o < 5 min dall'ultimo tool result |
| **Da Controllare** | Arancione | Hook / Watcher | Hook `Stop` o `Notification` — oppure — completato da < 60 min |
| **Inattivo** | Grigio | Watcher | > 60 min di inattività, segnato manualmente, o hook status scaduto |
| **Errore** | Rosso | Watcher | Impossibile leggere la sessione |

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

# 3. (Opzionale) Configura Telegram
cp backend/.env.example backend/.env
# Modifica backend/.env con token e chat ID del tuo bot

# 4. Avvia
npm run dev
# oppure su Windows: doppio click su start.bat
```

Apri `http://localhost:5173`

Al primo avvio, il backend indicizza automaticamente tutte le sessioni esistenti in `~/.claude/projects/`.

### Installazione Hooks

Per abilitare lo stato in tempo reale e le notifiche Telegram, installa gli hook a livello utente:

**1. Crea lo script hook:**

```bash
# Crea la cartella se non esiste
mkdir -p ~/.claude/hooks

# Crea lo script (sostituisci il percorso con il tuo username)
cat > ~/.claude/hooks/hook-event.sh << 'EOF'
#!/bin/bash
INPUT=$(cat)
curl -s -X POST "http://localhost:3001/api/hook-event" \
  -H "Content-Type: application/json" \
  -d "$INPUT" > /dev/null 2>&1 || true
EOF

chmod +x ~/.claude/hooks/hook-event.sh
```

**2. Registra gli hook in `~/.claude/settings.json`:**

```json
{
  "hooks": {
    "Stop": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<username>/.claude/hooks/hook-event.sh" }] }
    ],
    "PreToolUse": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<username>/.claude/hooks/hook-event.sh" }] }
    ],
    "PostToolUse": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<username>/.claude/hooks/hook-event.sh" }] }
    ],
    "Notification": [
      { "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<username>/.claude/hooks/hook-event.sh" }] }
    ]
  }
}
```

> Sostituisci `<username>` con il tuo nome utente Windows.

---

## Configurazione

### Cartelle radice (`backend/scan-paths.json`)

```json
[
  "C:\\Projects\\MyApp",
  "C:\\Work\\Clients",
  "C:\\Dev"
]
```

Puoi anche usare l'**Area Admin** nell'interfaccia per aggiungere o rimuovere percorsi.

### Percorsi esclusi (`backend/excluded-paths.json`)

Popolato automaticamente con il bottone **⊗** su ogni card. Per ripristinare: Admin → sezione "Percorsi esclusi".

### Notifiche Telegram + Wiki (`backend/.env`)

```env
TELEGRAM_TOKEN=<token-del-bot>
TELEGRAM_CHAT_ID=<chat-id>
DEEPSEEK_API_KEY=<chiave-deepseek>   # Per generazione wiki (opzionale)
```

Come ottenere i valori:
1. Crea un bot con [@BotFather](https://t.me/BotFather) → ottieni `TELEGRAM_TOKEN`
2. Invia `/start` al bot dalla chat dove vuoi ricevere le notifiche
3. Visita `https://api.telegram.org/bot<TOKEN>/getUpdates` per leggere il `chat.id`

Se `.env` non è presente o le variabili sono vuote, le notifiche Telegram vengono silenziosamente disabilitate — il resto della dashboard funziona normalmente.

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
| **Notifiche** | Telegram Bot API (native fetch — nessuna dipendenza aggiuntiva) |
| **Font** | Syne (Google Fonts), JetBrains Mono |
| **Piattaforma** | Windows — PowerShell + UIAutomation per rilevamento terminale |

---

## Struttura Progetto

```
DashboardClaudeCode/
├── backend/
│   ├── server.js              # Express + WebSocket + API REST + /api/hook-event
│   ├── claude-watcher.js      # Monitora sessioni Claude Code in tempo reale
│   ├── telegram.js            # Helper Telegram Bot API (native fetch)
│   ├── db.js                  # SQLite layer (FTS5, schema, query helpers)
│   ├── indexer.js             # Parser JSONL → SQLite FTS5 (+ hook wiki-ingest)
│   ├── path-scanner.js        # Discovery da cartelle radice
│   ├── wiki-backfill.js       # Genera wiki da tutte le sessioni (DeepSeek V3)
│   ├── wiki-ingest.js         # Aggiornamento incrementale wiki per sessione
│   ├── scan-paths.json        # Cartelle radice da scansionare
│   ├── excluded-paths.json    # Percorsi esclusi
│   ├── wiki-settings.json     # Configurazione wiki (path cartella Obsidian)
│   ├── .env                   # Credenziali Telegram + DeepSeek (gitignored)
│   ├── .env.example           # Template variabili d'ambiente
│   ├── agentsview.db          # Database SQLite (creato al primo avvio, gitignored)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Router shell (BrowserRouter)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Layout 3 colonne (Attivi/Check/Inattivi)
│   │   │   ├── Session.jsx            # Viewer sessione + export HTML
│   │   │   └── Analytics.jsx          # Heatmap + tool usage + breakdown
│   │   ├── components/
│   │   │   ├── ProjectCard.jsx        # Card progetto con azioni + hook badge
│   │   │   ├── SessionList.jsx        # Lista sessioni inline per card
│   │   │   ├── SearchBar.jsx          # Modal ricerca Cmd+K
│   │   │   └── AdminPanel.jsx         # Pannello configurazione
│   │   ├── hooks/
│   │   │   └── useWebSocket.js        # Hook WebSocket + hookStatuses state
│   │   └── index.css                  # Variabili CSS + animazioni
│   ├── index.html
│   └── package.json
├── start.bat                  # Avvio rapido Windows
├── package.json
└── README.md
```

---

## API Reference

### Monitoraggio Progetti (WebSocket)

**Endpoint:** `ws://localhost:3001`

**Config** (alla connessione e ad ogni aggiornamento lista):
```json
{ "type": "config", "projects": [{ "name": "MyProject", "path": "C:\\..." }] }
```

**Status update** (ad ogni cambio sessione):
```json
{
  "type": "status",
  "data": {
    "status": "active", "projectName": "MyProject",
    "lastUpdate": "2026-04-13T10:00:00Z", "lastOutput": "Bash: npm test",
    "slug": "sharded-wibbling-crab", "gitBranch": "main",
    "sessionId": "abc-123",
    "outputHistory": [{ "timestamp": "...", "output": "...", "toolName": "Bash" }]
  }
}
```

**Hook status update** (ad ogni evento hook da Claude Code):
```json
{
  "type": "hook_status",
  "projectPath": "C:\\Work\\MyProject",
  "projectName": "MioProgetto",
  "status": "active|waiting|review|idle",
  "timestamp": 1713000000000
}
```

### REST API

#### Progetti

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/health` | Stato server |
| `GET` | `/api/projects` | Lista progetti monitorati |
| `POST` | `/api/projects/:name/mark-checked` | Segna come controllato + cancella hook status |
| `POST` | `/api/projects/:name/exclude` | Escludi dal monitoraggio |
| `POST` | `/api/projects/:name/open-terminal` | Apri CMD nella directory |
| `GET` | `/api/projects/:name/terminal-windows` | Trova le tab del terminale |
| `POST` | `/api/focus-window/:pid` | Porta finestra in primo piano |

#### Hook Events

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/hook-event` | Riceve eventi da Claude Code hooks, aggiorna WS + Telegram |

Payload atteso (inviato automaticamente dallo script hook):
```json
{
  "hook_event_name": "Stop|PreToolUse|PostToolUse|Notification",
  "cwd": "C:\\Work\\MyProject",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test" },
  "tool_response": { "exit_code": 1, "output": "..." }
}
```

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
| `GET` | `/api/admin/wiki-settings` | Leggi impostazioni wiki (`wikiPath`) |
| `POST` | `/api/admin/wiki-settings` | Salva `wikiPath` in `wiki-settings.json` |
| `POST` | `/api/admin/wiki-backfill` | Avvia `wiki-backfill.js` in background |

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
<summary><b>Notifiche Telegram non arrivano</b></summary>

1. Verifica che `backend/.env` esista con `TELEGRAM_TOKEN` e `TELEGRAM_CHAT_ID` valorizzati
2. Assicurati di aver inviato `/start` al bot prima di aspettare notifiche
3. Controlla che il backend sia avviato con `node --env-file=.env server.js` (o via `npm run dev`)
4. Guarda i log del backend — errori API Telegram vengono stampati come `[telegram] API error: ...`

Per verificare il chat ID:
```
https://api.telegram.org/bot<TOKEN>/getUpdates
```

</details>

<details>
<summary><b>Hook status non aggiorna la dashboard</b></summary>

1. Verifica che `~/.claude/settings.json` contenga la sezione `hooks` con i 4 eventi
2. Verifica che lo script `~/.claude/hooks/hook-event.sh` esista e sia eseguibile (`chmod +x`)
3. Verifica che il percorso nello script usi slash forward (`/c/Users/...`) non backslash
4. Apri `http://localhost:3001/api/health` — se non risponde, il backend non è in esecuzione
5. Controlla che il backend sia sulla porta 3001 (quella configurata nello script hook)

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

### v7.0.0 (2026-04-17) — Wiki EGM: Knowledge Base automatica da sessioni

- **`wiki-backfill.js`**: scansiona le sessioni nel DB SQLite, chiama DeepSeek V3, genera pagine Markdown per ogni progetto in una cartella Obsidian configurabile
- **`wiki-ingest.js`**: hook in `indexer.js` — aggiorna la wiki incrementalmente ad ogni sessione indicizzata (via `setImmediate`)
- **`wiki-settings.json`**: struttura wiki completamente parametrizzata — categorie, pattern di match, sessionFilter, excludeFilter, systemPrompt, provider LLM — adattabile a qualsiasi dominio senza modificare codice
- **Admin → Wiki EGM**: sezione nel pannello admin per configurare wikiPath, provider LLM (preset DeepSeek/LM Studio/OpenAI + campi manuali URL server/modello/env key), categorie e system prompt
- **Provider LLM intercambiabile**: DeepSeek V3, LM Studio, OpenAI, Ollama — tutti OpenAI-compatibili, basta cambiare baseURL e model
- **API**: `GET/POST /api/admin/wiki-settings`, `POST/DELETE /api/admin/wiki-settings/categories`, `POST /api/admin/wiki-backfill`

### v6.0.0 (2026-04-14) — Claude Code Hooks + Telegram Integration

- **Hook status in tempo reale**: stato dei progetti aggiornato via push al 100% — nessun polling, evento immediato appena Claude Code inizia/finisce uno strumento
- **Notifiche Telegram**: bot ClaudeOps invia `✅ sessione terminata` e `💥 errore Bash (exit N)` con nome progetto e comando
- **Colonne guidate da hook**: `PreToolUse` → Attivi, `Stop`/`Notification` → Da Controllare — priorità su file watcher per 30 minuti
- **Badge hook su ProjectCard**: indicatore visivo dello stato hook corrente (⚡ HOOK ATTIVO / ⏳ IN ATTESA / 🔴 DA CONTROLLARE)
- **Bottone "Segna controllato" anche da hook**: funziona quando il progetto è in Da Controllare tramite hook Stop, non solo via watcher
- **Mark-checked cancella hook status**: cliccando il bottone, la card esce immediatamente da Da Controllare senza aspettare 30 minuti
- **Hook a livello utente**: hook registrati in `~/.claude/settings.json` — si attivano per tutti i progetti Claude Code sulla macchina
- **`backend/telegram.js`**: helper con native fetch (Node 18+) — zero dipendenze aggiuntive
- **`backend/.env`**: credenziali Telegram separate dal codice, caricate con `node --env-file=.env`

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
- Fix path discovery: codifica corretta caratteri non-ASCII (à, è, ecc.) su 2+ byte UTF-8
- Fix config URL: parametro `?v=` per evitare cache browser sul config
- Fix PIDs cleanup: pulizia automatica `terminal-pids.json` dei processi terminati
- Fix tail read: lettura corretta degli ultimi byte dei file JSONL
- Fix inline confirm: conferma esclusione visibile nel modal
- Rate limit su Riscansiona: debounce 2 secondi

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
