<div align="center">

<img src="frontend/public/icona.png" alt="Claude Code Dashboard" width="280" />

# Dashboard Claude Code

**Monitoraggio in tempo reale · Ricerca full-text · Analytics · Notifiche Telegram · Knowledge Base on-demand**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.2.0-blue)](https://reactjs.org/)
[![Version](https://img.shields.io/badge/version-8.0.0-purple)](https://github.com/Attilio81/ClaudeCodeDashboard)

*Monitora N sessioni Claude Code parallele, cerca nei messaggi passati, analizza i pattern di utilizzo, ricevi notifiche push su Telegram, e genera una knowledge base Markdown strutturata dal tuo codebase quando vuoi tu.*

[Avvio Rapido](#-avvio-rapido) • [Funzionalità](#-funzionalità) • [Knowledge Base](#-knowledge-base) • [Come Funziona](#-come-funziona) • [Configurazione](#-configurazione) • [API](#-api-reference) • [Troubleshooting](#-troubleshooting)

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

### Ricerca, Sessioni & Analytics

| Funzionalità | Descrizione |
|--------------|-------------|
| **Ricerca `Ctrl+K`** | Cerca in tutti i messaggi di tutte le sessioni indicizzate — SQLite FTS5, risultati con snippet evidenziato |
| **Session Viewer** | Accedi a qualsiasi sessione passata, naviga con `j`/`k`, esporta come HTML offline |
| **Analytics** | Heatmap attività (365 giorni), top 10 tool usage, breakdown per progetto |

### Notifiche Telegram

Il bot **ClaudeOps** invia notifiche push direttamente su Telegram:

| Evento | Notifica |
|--------|----------|
| Sessione terminata (`Stop`) | `✅ <progetto> — sessione terminata` |
| Errore Bash (`PostToolUse`, exit ≠ 0) | `💥 <progetto> — errore Bash (exit N)` + comando |

### Gestione Progetti

| Azione | Descrizione |
|--------|-------------|
| **Sessioni** | Toggle ▶ per vedere le ultime 5 sessioni indicizzate del progetto |
| **Escludi ⊗** | Rimuove il progetto dal monitoraggio |
| **Apri CMD** | Apre cmd.exe nella directory del progetto |
| **Trova finestra** | Individua la tab di Windows Terminal della sessione tramite UIAutomation |
| **Porta in primo piano ⬆** | Porta Windows Terminal in primo piano e seleziona la tab corretta |
| **Segna controllato** | Marca un progetto "Da Controllare" come rivisto |

### Area Admin

Pannello accessibile con **⚙ ADMIN** nell'header:
- Aggiungi / rimuovi cartelle radice di scansione
- **Riscansiona Ora** — trova nuovi progetti senza riavviare il server
- Ripristina percorsi esclusi

---

## Knowledge Base

La dashboard si integra con un sistema di documentazione tecnica basato su **5 slash command Claude Code** che scrivono direttamente in un vault Obsidian condiviso — senza LLM esterni, senza backend, senza API key aggiuntive.

### Il Problema

Col tempo si accumulano centinaia di sessioni che contengono decisioni architetturali, bug fix, pattern ricorrenti e documentazione implicita — tutto disperso e non ricercabile fuori dalla dashboard.

### La Soluzione

5 comandi slash, ognuno con uno scopo preciso:

| Comando | Quando usarlo | Area wiki |
|---------|--------------|-----------|
| `/analizzacodebase` | Prima analisi di un progetto / dopo refactor grosso | `Architettura/` |
| `/aggiornacodebase` | Dopo modifiche puntuali al codice | `Architettura/` |
| `/aggiornawiki <nota>` | Dopo ogni sessione significativa (bug fix, feature, decisione) | `Sessioni/` |
| `/aggiornamanuale <nota>` | Quando cambia come si usa il software | `Manuali/` |
| `/aggiornarilasci <versione>` | Prima o dopo un deploy | `Rilasci/` |

Claude scrive direttamente nella wiki usando i suoi tool — nessuna chiamata a provider LLM esterni.

### Struttura Vault

```
Wiki-Egm/
├── index.md                ← MOC aggiornato automaticamente da tutti i comandi
├── Sessioni/               ← /aggiornawiki       (cosa è successo)
│   ├── BIZ2017/
│   │   └── bneg0112.md
│   └── ProgettiEgm/
│       └── controllopadordini.md
│
├── Architettura/           ← /analizzacodebase, /aggiornacodebase  (com'è fatto il codice)
│   └── BIZ2017/
│       └── bneg0112/
│           ├── _overview.md
│           └── BNEG0112.md
│
├── Manuali/                ← /aggiornamanuale    (come si usa — utenti finali)
│   └── BIZ2017/
│       └── bneg0112.md
│
└── Rilasci/                ← /aggiornarilasci    (note di rilascio — IT/sviluppatori)
    └── BIZ2017/
        └── bneg0112-v1.5.md
```

`index.md` è il Map of Content (MOC) radice — ogni comando lo aggiorna automaticamente aggiungendo il modulo appena documentato con link alle 4 aree:

```markdown
## BIZ2017

| Modulo   | Architettura | Sessioni | Manuali | Rilasci  |
|----------|-------------|---------|---------|---------|
| bneg0112 | [[.../overview\|✓]] | [[...\|✓]] | — | [[...\|v1.5]] |
```

### /analizzacodebase e /aggiornacodebase

`/analizzacodebase` scansiona tutti i file sorgente del progetto corrente (`.vb`, `.cs`, `.js`, `.ts`, `.py`, ecc.) e genera un documento per file in `Architettura/` con layer architetturale, dipendenze e funzioni chiave.

`/aggiornacodebase` è la versione incrementale: rianalizza solo i file cambiati dall'ultima analisi, propagando l'aggiornamento ai file che dipendono da quelli modificati tramite il campo `depends_on` nel frontmatter.

Ogni pagina ha frontmatter YAML che alimenta il Graph View di Obsidian:

```yaml
---
layer: service
depends_on:
  - database
  - clienti
last_analyzed: 2026-04-24
---
```

### /aggiornawiki

Log di sessione. Traccia cosa è stato fatto, perché, quali decisioni prese.

```
/aggiornawiki ho corretto il calcolo delle commissioni in Ordini.vb,
il problema era nel round finale
```

Claude determina il file dalla directory corrente (`BIZ2017/bneg0112.md`), legge il file se esiste, aggiorna o crea la sezione, firma con data e utente.

### Wiki Condivisa in Rete

Punta `wikiPath` in `~/.claude/wiki-config.json` a una cartella di rete:

```json
{ "wikiPath": "\\\\SERVER\\Wiki\\EGM-Wiki" }
```

Ogni collega che usa i comandi alimenta la stessa knowledge base. Nessun conflitto: ogni macchina lavora su progetti diversi.

### Installazione Comandi

Copiare i file da `.claude/commands/` della repo in `~/.claude/commands/` e creare `~/.claude/wiki-config.json` con il percorso wiki. Vedi `Manuale d'uso/` nel vault per le istruzioni complete.

---

## Come Funziona

### Claude Code Hooks

La dashboard si integra con il sistema di hooks di Claude Code a livello utente — gli hook si attivano per **tutti** i progetti sulla macchina.

```
~/.claude/settings.json          ← hook registrati a livello utente
~/.claude/hooks/hook-event.sh    ← script che POST-a il payload al backend
```

Ad ogni evento (PreToolUse, PostToolUse, Stop, Notification), Claude Code esegue lo script che invia il payload JSON al backend su `POST /api/hook-event`.

**Mappa eventi → stato:**

| Hook event | Status dashboard | Colonna |
|------------|-----------------|---------|
| `PreToolUse` | `active` | Attivi |
| `Notification` | `waiting` | Da Controllare |
| `Stop` | `review` | Da Controllare |

Lo stato hook ha priorità sul file watcher per 30 minuti.

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

1. L'**indexer** legge il file `.jsonl` ed estrae messaggi, tool call, timestamp
2. Scrive in `backend/agentsview.db` (SQLite con FTS5)
3. Il **watcher** re-indicizza in background ad ogni cambio file
4. La ricerca full-text interroga la tabella FTS5 — risultati istantanei

### Stato Intelligente

| Stato | Colore | Condizione |
|-------|--------|------------|
| **Attivo** | Verde | Hook `PreToolUse` — oppure — tool in esecuzione o < 5 min |
| **Da Controllare** | Arancione | Hook `Stop` o `Notification` — oppure — completato da < 60 min |
| **Inattivo** | Grigio | > 60 min di inattività o segnato manualmente |
| **Errore** | Rosso | Impossibile leggere la sessione |

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
# Modifica backend/.env con i tuoi token

# 4. Avvia
npm run dev
# oppure su Windows: doppio click su start.bat
```

Apri `http://localhost:5173`

Al primo avvio, il backend indicizza automaticamente tutte le sessioni esistenti in `~/.claude/projects/`.

### Installazione Hooks

Per abilitare stato in tempo reale e notifiche Telegram:

**1. Crea lo script hook:**

```bash
mkdir -p ~/.claude/hooks

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
    "Stop":        [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<username>/.claude/hooks/hook-event.sh" }] }],
    "PreToolUse":  [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<username>/.claude/hooks/hook-event.sh" }] }],
    "PostToolUse": [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<username>/.claude/hooks/hook-event.sh" }] }],
    "Notification":[{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<username>/.claude/hooks/hook-event.sh" }] }]
  }
}
```

> Sostituisci `<username>` con il tuo nome utente Windows.

---

## Configurazione

### Cartelle radice (`backend/scan-paths.json`)

```json
["C:\\BIZ2017", "C:\\ProgettiEgm", "C:\\BUSEXP"]
```

Oppure usa l'**Area Admin** nell'interfaccia.

### Telegram (`backend/.env`)

```env
TELEGRAM_TOKEN=<token-del-bot>
TELEGRAM_CHAT_ID=<chat-id>
```

Come ottenere i valori Telegram:
1. Crea un bot con [@BotFather](https://t.me/BotFather) → ottieni `TELEGRAM_TOKEN`
2. Invia `/start` al bot dalla chat dove vuoi ricevere le notifiche
3. Visita `https://api.telegram.org/bot<TOKEN>/getUpdates` per leggere il `chat.id`

Se `.env` non è presente, Telegram viene silenziosamente disabilitato.

### Percorsi esclusi

Popolato automaticamente con il bottone **⊗** su ogni card. Per ripristinare: Admin → sezione "Percorsi esclusi".

---

## Scorciatoie Tastiera

| Tasto | Dove | Azione |
|-------|------|--------|
| `Ctrl+K` / `Cmd+K` | Ovunque | Apri/chiudi ricerca globale |
| `Esc` | Ovunque | Chiudi modal / torna indietro |
| `↑` / `↓` | Ricerca | Naviga risultati |
| `↵` | Ricerca | Apri sessione selezionata |
| `j` / `k` | Session viewer | Messaggio successivo / precedente |
| `o` | Session viewer | Inverti ordine messaggi |

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
│   ├── indexer.js             # Parser JSONL → SQLite FTS5
│   ├── db.js                  # SQLite layer (FTS5, schema, query helpers)
│   ├── telegram.js            # Helper Telegram Bot API (native fetch)
│   ├── path-scanner.js        # Discovery da cartelle radice
│   ├── scan-paths.json        # Cartelle radice da scansionare
│   ├── excluded-paths.json    # Percorsi esclusi dal monitoraggio
│   ├── .env                   # Credenziali Telegram (gitignored)
│   ├── .env.example           # Template variabili d'ambiente
│   ├── agentsview.db          # Database SQLite (creato al primo avvio, gitignored)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Layout 3 colonne (Attivi/Check/Inattivi)
│   │   │   ├── Session.jsx            # Viewer sessione + export HTML
│   │   │   └── Analytics.jsx          # Heatmap + tool usage + breakdown
│   │   └── components/
│   │       ├── ProjectCard.jsx        # Card progetto con azioni + hook badge
│   │       ├── SessionList.jsx        # Lista sessioni inline per card
│   │       ├── SearchBar.jsx          # Modal ricerca Cmd+K
│   │       └── AdminPanel.jsx         # Pannello configurazione scan roots
│   ├── index.html
│   └── package.json
├── .claude/
│   └── commands/              # Slash command knowledge base (copiare in ~/.claude/commands/)
│       ├── analizzacodebase.md
│       ├── aggiornacodebase.md
│       ├── aggiornawiki.md
│       ├── aggiornamanuale.md
│       └── aggiornarilasci.md
├── Modelli/
│   ├── template_manuale_utente.md     # Template per /aggiornamanuale
│   └── template_note_rilascio.md      # Template per /aggiornarilasci
├── start.bat                  # Avvio rapido Windows
├── package.json
└── README.md
```

---

## API Reference

### WebSocket — `ws://localhost:3001`

**Config** (alla connessione):
```json
{ "type": "config", "projects": [{ "name": "MyProject", "path": "C:\\..." }] }
```

**Status update** (ad ogni cambio sessione):
```json
{
  "type": "status",
  "data": { "status": "active", "projectName": "MyProject", "lastUpdate": "...", "lastOutput": "Bash: npm test" }
}
```

**Hook status update**:
```json
{ "type": "hook_status", "projectPath": "...", "status": "active|waiting|review|idle", "timestamp": 0 }
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
| `GET` | `/api/projects/:name/terminal-windows` | Trova tab terminale |
| `POST` | `/api/focus-window/:pid` | Porta finestra in primo piano |

#### Hook Events

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `POST` | `/api/hook-event` | Riceve eventi da Claude Code hooks |

#### Sessioni & Ricerca

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/sessions?project=X&limit=20` | Lista sessioni indicizzate |
| `GET` | `/api/sessions/:id` | Sessione + messaggi |
| `GET` | `/api/sessions/:id/messages?limit=50` | Solo messaggi |
| `GET` | `/api/sessions/:id/export` | Download HTML |
| `GET` | `/api/search?q=testo&limit=20` | Ricerca full-text FTS5 |
| `GET` | `/api/analytics` | Heatmap + tool usage + breakdown |

#### Admin

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| `GET` | `/api/admin/scan-paths` | Lista cartelle radice |
| `POST` | `/api/admin/scan-paths` | Aggiungi cartella |
| `DELETE` | `/api/admin/scan-paths/:index` | Rimuovi cartella |
| `POST` | `/api/admin/rescan` | Riscansiona senza riavvio |
| `GET` | `/api/admin/excluded-paths` | Lista percorsi esclusi |
| `DELETE` | `/api/admin/excluded-paths/:index` | Ripristina percorso |

---

## Troubleshooting

<details>
<summary><b>Porta 3001 già in uso (EADDRINUSE)</b></summary>

```powershell
taskkill /f /im node.exe
# oppure
npx kill-port 3001
```

</details>

<details>
<summary><b>Progetto non rilevato</b></summary>

Verifica che esista una directory sessione in `~/.claude/projects/`:

```powershell
ls "$env:USERPROFILE\.claude\projects\" | Where-Object Name -like "*NOMEPROGETTO*"
```

Se esiste ma non appare, controlla `scan-paths.json` e fai **Riscansiona** dal pannello Admin.

</details>

<details>
<summary><b>Notifiche Telegram non arrivano</b></summary>

1. Verifica che `backend/.env` esista con `TELEGRAM_TOKEN` e `TELEGRAM_CHAT_ID` valorizzati
2. Assicurati di aver inviato `/start` al bot
3. Guarda i log del backend — errori API Telegram vengono stampati come `[telegram] API error: ...`

</details>

<details>
<summary><b>Hook status non aggiorna la dashboard</b></summary>

1. Verifica che `~/.claude/settings.json` contenga la sezione `hooks` con i 4 eventi
2. Verifica che `~/.claude/hooks/hook-event.sh` esista e sia eseguibile (`chmod +x`)
3. Verifica che il percorso nello script usi slash forward (`/c/Users/...`)
4. Apri `http://localhost:3001/api/health` — se non risponde, il backend non è avviato

</details>

<details>
<summary><b>Ricerca non trova risultati attesi</b></summary>

Il database si popola all'avvio e ad ogni modifica delle sessioni. Riavvia il server per indicizzare sessioni vecchie. Nota: caratteri speciali FTS5 (`"`, `+`, `-`, `*`) nella query possono dare risultati vuoti — usa termini semplici.

</details>

<details>
<summary><b>"Trova finestra" non trova nulla</b></summary>

Richiede Claude Code attivo con file in `~/.claude/sessions/` con `cwd` corrispondente, e il processo figlio di Windows Terminal o cmd.

</details>

<details>
<summary><b>Il bottone ⬆ non porta la finestra in primo piano</b></summary>

Windows blocca `SetForegroundWindow` dai processi in background. La dashboard usa il workaround del tasto ALT. Se non funziona, clicca prima sulla dashboard e poi su ⬆.

</details>

<details>
<summary><b>I comandi /analizzacodebase o /aggiornawiki non trovano i file</b></summary>

1. Verifica che `~/.claude/wiki-config.json` esista con `wikiPath` corretto
2. Verifica che la share di rete sia accessibile: apri `\\egmsql\EGMStruttura\Wiki-Egm` da Esplora risorse
3. Verifica che i file dei comandi siano in `~/.claude/commands/` (non solo nella repo)
4. Consulta `Manuale d'uso/installazione` nel vault per le istruzioni complete

</details>

---

## Changelog

<small>

**v8.0.0** (2026-04-24) — Knowledge System unificato
- 5 slash command Claude Code sostituiscono completamente il pannello Admin wiki
- `/analizzacodebase`: scansione completa codebase → `Architettura/` con frontmatter YAML e layer diagram
- `/aggiornacodebase`: aggiornamento incrementale con propagazione inversa dipendenze via `depends_on`
- `/aggiornawiki`, `/aggiornamanuale`, `/aggiornarilasci`: path aggiornati alla nuova struttura vault
- Vault strutturato in 4 aree: `Sessioni/`, `Architettura/`, `Manuali/`, `Rilasci/`
- `~/.claude/wiki-config.json`: configurazione centralizzata percorso wiki, nessun LLM esterno richiesto
- Rimossi: `wiki-backfill.js`, `wiki-ingest.js`, `wiki-settings.json`, endpoint wiki backend, sezione Wiki EGM da AdminPanel
- `Manuale d'uso/` nel vault: guida completa installazione e utilizzo per i colleghi

**v7.2.0** (2026-04-19) — Wiki on-demand
- `/aggiornawiki`: Claude scrive direttamente nella wiki senza LLM esterno
- Wiki condivisa su rete: `\\egmsql\EGMStruttura\Wiki-Egm`

**v7.1.0** (2026-04-18) — Wiki: source files enrichment
- Backfill e ingest leggono i file sorgente realmente toccati nelle sessioni

**v7.0.0** (2026-04-17) — Wiki EGM
- `wiki-backfill.js`: genera pagine Markdown da tutte le sessioni via LLM
- Provider intercambiabili: DeepSeek V3, LM Studio, OpenAI, Ollama

**v6.0.0** (2026-04-14) — Claude Code Hooks + Telegram
- Hook status in tempo reale — nessun polling
- Notifiche Telegram: `✅ sessione terminata` e `💥 errore Bash`

**v5.0.0** (2026-04-13) — Search + Analytics + Session Viewer
- Ricerca full-text `Ctrl+K` su tutte le sessioni (SQLite FTS5)
- Session viewer con export HTML offline
- Analytics: heatmap + tool usage + breakdown per progetto

**v4.x** (2026-04-02) — UIAutomation + Scan Roots
- Discovery da cartelle radice configurabili
- Trova finestra terminale via UIAutomation
- Dark theme — Syne + JetBrains Mono

**v1.0 – v3.0**
- v3.0: Auto-discovery dinamico, timeout intelligenti, storico sessione
- v2.0: Parsing file `.jsonl` in tempo reale
- v1.0: Monitoraggio via `status.json`, WebSocket + UI

</small>

---

<div align="center">

**[Segnala un Bug](https://github.com/Attilio81/ClaudeCodeDashboard/issues)** • **[Richiedi una Funzionalità](https://github.com/Attilio81/ClaudeCodeDashboard/issues)**

Made with Claude Code

</div>
