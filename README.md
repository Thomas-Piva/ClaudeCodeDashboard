<div align="center">

<img src="frontend/public/icona.png" alt="Claude Code Dashboard" width="280" />

# Dashboard Claude Code

**Monitoraggio in tempo reale · Ricerca full-text · Analytics · Notifiche Telegram · Knowledge Base on-demand**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.2.0-blue)](https://reactjs.org/)
[![Version](https://img.shields.io/badge/version-8.0.0-purple)](https://github.com/Attilio81/ClaudeCodeDashboard)

*Monitora N sessioni Claude Code parallele, cerca nei messaggi passati, analizza i pattern di utilizzo, ricevi notifiche push su Telegram, e genera una knowledge base Markdown strutturata dal tuo codebase quando vuoi tu.*

[Avvio Rapido](#avvio-rapido) • [Workflow giornaliero](WORKFLOW.md) • [Knowledge Base](#knowledge-base-schema-karpathy) • [Graphify](#graphify-integrato-via-slash-command) • [Configurazione](#configurazione) • [Troubleshooting](#troubleshooting)

> 📖 **Quick reference uso quotidiano**: vedi [`WORKFLOW.md`](WORKFLOW.md) per setup, comandi slash, pattern d'uso e troubleshooting rapidi.

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
| **Apri terminale** | Apre Windows Terminal con tab WSL nella dir progetto e lancia `claude` |
| **Trova finestra** | Individua la tab di Windows Terminal della sessione tramite UIAutomation |
| **Porta in primo piano ⬆** | Porta Windows Terminal in primo piano e seleziona la tab corretta |
| **Segna controllato** | Marca un progetto "Da Controllare" come rivisto |

### Area Admin

Pannello accessibile con **⚙ ADMIN** nell'header:
- Aggiungi / rimuovi cartelle radice di scansione
- **Riscansiona Ora** — trova nuovi progetti senza riavviare il server
- Ripristina percorsi esclusi

---

## Knowledge Base (schema Karpathy)

Vault Obsidian + **7 slash command Claude Code** che scrivono direttamente nel vault — 5 narrativi LLM-generated + 2 graphify (CLI deterministica AST).

### Filosofia divisione AI / umano

- **Graphify/** → consumo primario AI (Claude). `graph.json` queryable + `GRAPH_REPORT.md` god nodes. 71x meno token vs grep raw files.
- **Architettura/** → narrativa LLM-generated. Leggibile sia da Claude che da umano.
- **Sessioni/Manuali/Rilasci/** → consumo primario umano. Cronologia decisioni + procedure + note deploy.

### 7 comandi slash

| Comando | Quando | Area vault |
|---------|--------|-----------|
| `/analizzacodebase` | Prima volta su progetto / refactor grosso | `progetti/<nome>/Architettura/{file}.md` + `_overview.md` |
| `/aggiornacodebase` | Modifiche puntuali al codice | idem (incrementale via `depends_on`) |
| `/aggiornawiki <nota>` | Dopo ogni sessione significativa | `progetti/<nome>/Sessioni/<YYYY-MM-DD>.md` |
| `/aggiornamanuale <area>` | Quando cambia come si usa il software | `progetti/<nome>/Manuali/<area>.md` |
| `/aggiornarilasci <versione>` | Prima o dopo un deploy | `progetti/<nome>/Rilasci/v<X>.md` |
| `/graphify` | Prima volta graphify su progetto | `progetti/<nome>/Graphify/` (graph.json + html + GRAPH_REPORT.md) |
| `/aggiornagraphify` | Codice modificato | idem (incrementale, AST-only, no LLM) |

Tutti appendono entry a `log.md` root e aggiornano `index.md` MOC con tabella per progetto.

### Struttura vault Karpathy

```
ClaudeWiki/
├── index.md                    ← MOC globale, 6 colonne: Architettura/Sessioni/Manuali/Rilasci/Graphify
├── log.md                      ← Timeline append-only
├── global/io.md                ← Contesto personale
├── raw/                        ← Fonti immutabili
├── wiki/                       ← Concetti/sintesi generale
└── progetti/<nome>/
    ├── Architettura/           ← /analizzacodebase
    │   ├── _overview.md
    │   └── {file}.md           ← frontmatter: layer, depends_on, last_analyzed
    ├── Sessioni/               ← /aggiornawiki (file per giorno)
    │   └── 2026-04-25.md
    ├── Manuali/                ← /aggiornamanuale (per area)
    │   └── installazione.md
    ├── Rilasci/                ← /aggiornarilasci
    │   └── v1.0.0.md
    └── Graphify/               ← /graphify, /aggiornagraphify
        ├── graph.json          ← AST + concetti queryable
        ├── graph.html          ← interactive viewer
        └── GRAPH_REPORT.md     ← god nodes + community structure
```

### Setup wiki path

`~/.claude/wiki-config.json` (in WSL):

```json
{ "wikiPath": "/home/thomas/obsidian_second_brain/second_brain/ClaudeWiki" }
```

### Installazione comandi (WSL)

```bash
cp /mnt/c/ClaudeCodeDashboard/.claude/commands/*.md ~/.claude/commands/
```

Poi `/reload-plugins` in Claude Code.

### Frontmatter Architettura/

Alimenta Graph View Obsidian:

```yaml
---
layer: service
depends_on:
  - database
  - clienti
last_analyzed: 2026-04-25
source: backend/api/users.js
---
```

`/aggiornacodebase` rianalizza solo file modificati propagando ai dipendenti via `depends_on`.

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
Windows 11 22H2+ (per WSL2 mirrored networking)
WSL2 con Ubuntu-24.04 (o altra distro)
Node.js >= 18 (su Windows host)
Claude Code installato dentro WSL
```

### Setup WSL hybrid

Backend Node + Frontend Vite girano su Windows host nativo. Claude Code gira dentro WSL. La dashboard monitora le sessioni WSL via UNC `\\wsl.localhost\<distro>\`.

**1. Fork + clone (Windows)**

```powershell
# Fork via gh (in WSL o Windows)
gh repo fork Attilio81/ClaudeCodeDashboard --clone=false

# Clone su Windows host
cd C:\
git clone https://github.com/<tuouser>/ClaudeCodeDashboard.git
cd C:\ClaudeCodeDashboard

# Install dipendenze
npm install
cd backend && npm install
cd ..\frontend && npm install && cd ..
```

**2. Configura WSL distro/user**

Modifica `backend/config.json`:

```json
{
  "wslDistro": "Ubuntu-24.04",
  "wslUser": "thomas",
  "projects": []
}
```

Verifica nome distro con `wsl --list --verbose`.

**3. WSL2 mirrored networking**

Crea/modifica `%USERPROFILE%\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
firewall=true
```

Riavvia WSL: `wsl --shutdown`.

> Mirrored networking permette al hook bash dentro WSL di pingare il backend Windows su `localhost:3001`. Se rompe VPN/Docker, torna a NAT — il hook fa fallback automatico via gateway IP.

**4. Firewall: porta 3001 inbound**

PowerShell come **Amministratore**:

```powershell
New-NetFirewallRule -DisplayName "ClaudeCodeDashboard" `
  -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

**5. Configura percorsi scansionati**

`backend/scan-paths.json` contiene path Linux:

```json
["/home/thomas"]
```

Il backend converte internamente in UNC. Esclusioni in `backend/excluded-paths.json` (path Linux).

**6. (Opzionale) Telegram**

```bash
cp backend/.env.example backend/.env
# Modifica TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, DEEPSEEK_API_KEY
```

**7. Avvio**

```powershell
npm run dev
# oppure doppio click su start.bat
```

Apri `http://localhost:5173`.

### Hook WSL → Dashboard Windows

I hook girano dentro WSL e POST a `http://localhost:3001/api/hook-event` (mirrored networking).

**1. Crea script hook in WSL:**

```bash
mkdir -p ~/.claude/hooks

cat > ~/.claude/hooks/hook-event.sh << 'EOF'
#!/bin/bash
set -u
INPUT=$(cat)
[ -z "$INPUT" ] && exit 0

PORT=3001
TIMEOUT=2

post() {
  curl -fsS --max-time "$TIMEOUT" -X POST "$1/api/hook-event" \
    -H 'Content-Type: application/json' \
    --data-binary "$INPUT" >/dev/null 2>&1
}

# Mirrored networking → localhost punta a Windows host
if post "http://localhost:$PORT"; then exit 0; fi

# Fallback: gateway IP (NAT mode)
GATEWAY=$(ip route show default 2>/dev/null | awk '/default/ {print $3; exit}')
if [ -n "$GATEWAY" ]; then post "http://$GATEWAY:$PORT" || true; fi
exit 0
EOF

chmod +x ~/.claude/hooks/hook-event.sh
```

**2. Registra hook in `~/.claude/settings.json` (sezione `hooks`):**

```json
"hooks": {
  "Stop":         [{ "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/hook-event.sh", "async": true }] }],
  "PreToolUse":   [{ "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/hook-event.sh", "async": true }] }],
  "PostToolUse":  [{ "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/hook-event.sh", "async": true }] }],
  "Notification": [{ "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/hook-event.sh", "async": true }] }]
}
```

### Wiki path (vault Obsidian)

I 5 slash command leggono il vault da `~/.claude/wiki-config.json`:

```bash
cat > ~/.claude/wiki-config.json << 'EOF'
{
  "wikiPath": "/home/thomas/obsidian_second_brain/second_brain/ClaudeWiki"
}
EOF
```

Schema vault (Karpathy):

```
ClaudeWiki/
├── index.md              # MOC globale
├── log.md                # Timeline append-only di tutti i comandi
├── global/io.md          # Contesto personale
└── progetti/<nome>/
    ├── Architettura/
    ├── Sessioni/
    ├── Manuali/
    ├── Rilasci/
    └── Graphify/         # Opzionale, da tool esterno
```

---

## Graphify (integrato via slash command)

[Graphify](https://github.com/safishamsi/graphify) genera grafo deterministico AST-level del codebase. Ora integrato via slash command `/graphify` e `/aggiornagraphify` che orchestrano CLI + sync nel vault.

### Installazione (in WSL)

```bash
# Recommended: uv tool (auto PATH setup)
uv tool install graphifyy   # ⚠️ doppia y — 'graphify' è unaffiliated

# In alternativa:
pipx install graphifyy
```

> CLI binary si chiama `graphify`. Pacchetto PyPI ufficiale è `graphifyy`.

### Uso dai slash command

```
/graphify             # prima volta su progetto → AST + sync nel vault
/aggiornagraphify     # incrementale → re-extract solo file modificati
```

Output sincronizzato in `<wikiPath>/progetti/<nome>/Graphify/`:
- `graph.json` — grafo persistente queryable
- `graph.html` — interactive viewer (apri in browser)
- `GRAPH_REPORT.md` — god nodes + community structure + suggested questions

File esclusi dal sync: `cache/` (locale), `manifest.json`, `cost.json`.

### Differenza con `/analizzacodebase`

| | `/analizzacodebase` | `/graphify` |
|---|---|---|
| **Esecutore** | Claude Code (LLM, token cost) | CLI Python deterministica (zero LLM) |
| **Granularità** | File-level narrativa | AST-level grafo nodi/edges |
| **Output** | `Architettura/<file>.md` | `Graphify/{graph.json, graph.html, GRAPH_REPORT.md}` |
| **Audience primaria** | Umano | Claude (consumo AI primario) |
| **Update** | `/aggiornacodebase` (via `depends_on`) | `/aggiornagraphify` (via SHA256 cache) |
| **Velocità** | Token-bound, lento | Veloce, scaling con codebase |

**Complementari**: Claude legge `Graphify/GRAPH_REPORT.md` per orientarsi rapidamente, poi `Architettura/_overview.md` come fallback narrativo se Graphify lacuna.

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
