# Workflow giornaliero

Quick-reference per uso quotidiano del sistema **ClaudeCodeDashboard + ClaudeWiki + Graphify**.

## TL;DR

```
Windows host:   npm run dev (su C:\ClaudeCodeDashboard) → dashboard su :5173, backend :3001
WSL Ubuntu:     claude su un progetto → status live nel dashboard
Vault Obsidian: aperto su /home/thomas/obsidian_second_brain/second_brain/ClaudeWiki
```

## Avvio sistema (ogni mattina)

### 1. Backend + frontend (Windows)

```powershell
cd C:\ClaudeCodeDashboard
npm run dev
```

Atteso log:
```
🚀 Dashboard Claude Code Backend
📡 http://localhost:3001
📊 N progetti monitorati
```

Apri browser: `http://localhost:5173`.

### 2. Verifica veloce

```bash
# Da WSL
curl -s http://localhost:3001/api/health
# → {"status":"ok","projects":N}
```

Se KO → vedi sezione [Troubleshooting](#troubleshooting).

## Lavoro su progetto

### Avvio sessione Claude su progetto esistente

**Da WSL**:
```bash
cd ~/<nome-progetto>
claude
```

**Dalla dashboard** (Windows):
- Click card progetto → "Apri terminale" → wt.exe + WSL + claude lanciato

### Card dashboard mostra
- Status: Attivo / Da Controllare / Inattivo
- Last output (tronco messaggio claude)
- Tool corrente in uso
- Slug task corrente

### Gestione card
| Azione | Effetto |
|--------|---------|
| **Apri terminale** | wt.exe nuova tab WSL + claude |
| **Trova finestra** | UIAutomation cerca tab Windows Terminal |
| **⬆ in primo piano** | Porta wt.exe foreground |
| **Segna controllato** | Marca "Da Controllare" come rivisto |
| **Escludi ⊗** | Rimuove progetto dal monitoraggio |

## Ricerca cross-sessioni

Premi `Ctrl+K` nel dashboard. SQLite FTS5 cerca in tutti i messaggi indicizzati.

Esempi query: `wsl mirrored`, `auth bug`, `prisma migration`.

## Slash command (dentro Claude Code WSL)

7 comandi disponibili — scrivono nel vault Karpathy `~/obsidian_second_brain/second_brain/ClaudeWiki/`.

### Wiki (5)

| Comando | Quando | Output |
|---------|--------|--------|
| `/analizzacodebase` | Prima volta su progetto / refactor grosso | `progetti/<nome>/Architettura/{file}.md` + `_overview.md` |
| `/aggiornacodebase` | Modifiche puntuali | idem (incrementale via `depends_on`) |
| `/aggiornawiki <nota>` | Sessione singola | `progetti/<nome>/Sessioni/<YYYY-MM-DD>.md` |
| `/aggiornamanuale` | Doc utente cambia | `progetti/<nome>/Manuali/<area>.md` |
| `/aggiornarilasci v<X>` | Deploy | `progetti/<nome>/Rilasci/v<X>.md` |

### Graphify (2)

| Comando | Quando | Output |
|---------|--------|--------|
| `/graphify` | Prima volta su progetto | `progetti/<nome>/Graphify/` (graph.json + html + GRAPH_REPORT.md) |
| `/aggiornagraphify` | Codice modificato | idem (incrementale, AST-only, no LLM) |

Tutti appendono entry a `log.md` e aggiornano `index.md` MOC del vault.

## Pattern uso tipici

### "Ho appena finito una sessione, voglio salvare cosa ho fatto"

```
/aggiornawiki Implementato fix per X. Cause: Y. Fix: Z.
```

→ Crea/aggiorna `progetti/<nome>/Sessioni/{data}.md` + log + index.

### "Primo giorno su un progetto nuovo"

```
1. /graphify              # struttura AST per Claude
2. /analizzacodebase       # narrativa per umano
3. (lavoro)
4. /aggiornawiki <riassunto>
```

### "Modifiche al codice, voglio refresh struttura"

```
/aggiornagraphify          # rapido, no LLM
/aggiornacodebase          # narrativo, costa token
```

### "Voglio capire un progetto velocemente"

Ordine lettura nel vault:
1. `index.md` MOC
2. `progetti/<nome>/Graphify/GRAPH_REPORT.md` (god nodes, sintesi)
3. `progetti/<nome>/Architettura/_overview.md` (narrativa)
4. `progetti/<nome>/Sessioni/` ultime 2-3 entry

### "Deploy fatto, voglio note rilascio"

```
/aggiornarilasci 2.1.0
```

→ Risponde a domande su artefatti, modifiche DB, funzionamento.

## Filosofia divisione vault

- **Graphify/** → consumo AI primario. Claude legge `GRAPH_REPORT.md` + `graph.json` per query strutturate (71x meno token vs grep raw files).
- **Architettura/** → narrativa LLM-generated. Leggibile sia Claude che umano.
- **Sessioni/Manuali/Rilasci/** → consumo umano primario. Cronologia decisioni, procedure, deploy.

## Configurazione

### File chiave

| File | Scopo |
|------|-------|
| `~/.claude/wiki-config.json` | Path vault Obsidian |
| `~/.claude/hooks/hook-event.sh` | Hook WSL → backend Windows (mirrored + gateway fallback) |
| `~/.claude/settings.json` | Hook events Stop/PreToolUse/PostToolUse/Notification |
| `C:\ClaudeCodeDashboard\backend\config.json` | wslDistro, wslUser |
| `C:\ClaudeCodeDashboard\backend\scan-paths.json` | Path Linux scansionati (es. `/home/thomas`) |
| `C:\ClaudeCodeDashboard\backend\excluded-paths.json` | Path Linux esclusi (.claude, .claude-mem, vault) |

### Aggiungere/escludere progetti

Da UI Admin (icona ⚙ nel header):
- "Cartelle radice" → aggiungi/rimuovi path Linux
- "Riscansiona Ora" → cerca nuovi progetti senza riavvio
- "Debug Path Encoding" → verifica encoding `/home/thomas/X` → `-home-thomas-X` matcha dir su `~/.claude/projects/`

## Troubleshooting

### Backend non parte: "exit code 9"
Manca `backend/.env`. Crea vuoto:
```powershell
echo $null > C:\ClaudeCodeDashboard\backend\.env
```

### DB locked
```powershell
Stop-Process -Name node -Force
del C:\ClaudeCodeDashboard\backend\agentsview.db
npm run dev   # ricrea DB
```

### Frontend dice "offline"
Backend non risponde. Check log PowerShell `npm run dev`. Verifica `curl http://localhost:3001/api/health`.

### Hook WSL non arrivano al backend
```bash
# Test mirrored networking
curl http://localhost:3001/api/health   # da WSL

# Se fallisce → mirrored non attivo
cat /mnt/c/Users/yolob/.wslconfig
# Atteso: networkingMode=mirrored

# Riavvia WSL (perde sessioni claude attive!)
# Da PowerShell: wsl --shutdown
```

### Re-indicizzazione lenta a ogni restart
Già ottimizzato con mtime skip. Se ancora lento:
```
📚 Catch-up indexing: 8 progetti, X (re)indicizzate, Y invariate
```
Y dovrebbe essere alto (≥30 dopo primo full index).

### Progetto fantasma in dashboard
Es. `graphify-out/` orfano scoperto come progetto. Rimedio:
- Click "Escludi ⊗" sulla card → aggiunto a `excluded-paths.json` automaticamente.

### Slash command non visibile
```bash
ls ~/.claude/commands/
# Atteso: 7 file .md (5 wiki + 2 graphify)

# Se mancano → copia da repo
cp /mnt/c/ClaudeCodeDashboard/.claude/commands/*.md ~/.claude/commands/
```

Poi `/reload-plugins` in Claude Code.

## Setup nuovo PC

1. Fork repo (Windows)
2. `git clone https://github.com/<user>/ClaudeCodeDashboard.git C:\ClaudeCodeDashboard`
3. `npm install` (root + backend + frontend)
4. `%USERPROFILE%\.wslconfig` → mirrored networking
5. `wsl --shutdown` per applicare
6. Firewall rule porta 3001 (admin PS)
7. WSL: copia comandi → `cp /mnt/c/ClaudeCodeDashboard/.claude/commands/*.md ~/.claude/commands/`
8. WSL: crea `~/.claude/wiki-config.json` con path vault
9. WSL: install hook `~/.claude/hooks/hook-event.sh`
10. WSL: install graphify → `uv tool install graphifyy` (recommended)
11. Avvia: `npm run dev` su Windows

Vedi README.md "Avvio Rapido" per dettagli completi.

## File del sistema (mappa)

```
C:\ClaudeCodeDashboard\           ← repo Windows
├── backend/                       ← Node.js Windows
│   ├── server.js                  ← API + WS + UNC scan
│   ├── path-scanner.js            ← discovery via UNC
│   ├── claude-watcher.js          ← chokidar polling 1.5s
│   ├── wsl-utils.js               ← encoder Linux→claudeDir + UNC helpers
│   ├── config.json                ← wslDistro, wslUser
│   ├── scan-paths.json            ← path Linux scansionati
│   └── excluded-paths.json        ← path esclusi
├── frontend/                      ← React Vite Windows
│   ├── src/components/AdminPanel.jsx  ← config UI + debug encoding
│   └── src/pages/Guida.jsx        ← guida WSL hybrid
├── .claude/commands/              ← 7 slash command (master copy)
├── README.md                      ← doc completa
└── WORKFLOW.md                    ← questo file

~/.claude/                         ← WSL
├── commands/                      ← 7 slash command (sync da repo)
├── hooks/hook-event.sh            ← bridge WSL→backend Windows
├── wiki-config.json               ← path vault
└── settings.json                  ← hook registrations

~/obsidian_second_brain/second_brain/ClaudeWiki/   ← vault Karpathy
├── CLAUDE.md                      ← schema + ordine lettura
├── index.md                       ← MOC globale (6 colonne)
├── log.md                         ← timeline append-only
├── global/io.md                   ← contesto personale
├── raw/                           ← fonti immutabili
├── wiki/                          ← concetti/sintesi generale
└── progetti/<nome>/
    ├── Architettura/              ← narrativa LLM
    ├── Sessioni/                  ← log giornaliero
    ├── Manuali/                   ← procedure utente
    ├── Rilasci/                   ← note deploy
    └── Graphify/                  ← grafo AST (consumo AI)
```
