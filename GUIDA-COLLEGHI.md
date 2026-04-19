# Guida: Dashboard Claude Code + Wiki EGM

Questa guida ti permette di collegare il tuo Claude Code alla dashboard condivisa e alla wiki tecnica del team.

---

## Cosa ottieni

- **Dashboard** su `http://localhost:5173` — vedi tutte le tue sessioni Claude Code attive, le cerchi, le esporti
- **Notifiche Telegram** — ricevi un messaggio quando una sessione finisce o va in errore
- **Wiki condivisa** su `\\egmsql\EGMStruttura\Wiki-Egm` — documentazione tecnica dei moduli, aggiornata da tutti i colleghi con `/aggiornawiki`

---

## 1. Prerequisiti

- Node.js >= 18 — verifica con `node -v`
- Git

---

## 2. Installazione

```bash
# Clona il repository
git clone https://github.com/Attilio81/ClaudeCodeDashboard.git
cd ClaudeCodeDashboard

# Installa le dipendenze
npm install
cd backend && npm install
cd ../frontend && npm install && cd ..
```

---

## 3. Configura le tue cartelle di lavoro

Apri `backend/scan-paths.json` e inserisci le cartelle radice dei tuoi progetti:

```json
["C:\\BIZ2017", "C:\\ProgettiEgm", "C:\\BUSEXP"]
```

Usa le cartelle dove hai i tuoi progetti — la dashboard le scansiona automaticamente in profondità.

---

## 4. Configura Telegram (opzionale)

Copia il file `.env` di esempio:

```bash
cp backend/.env.example backend/.env
```

Chiedi ad Attilio i valori di `TELEGRAM_TOKEN` e `TELEGRAM_CHAT_ID` da inserire nel file.

---

## 5. Avvia la dashboard

```bash
npm run dev
# oppure doppio click su start.bat
```

Apri `http://localhost:5173` — vedrai subito le tue sessioni Claude Code.

---

## 6. Installa gli hook Claude Code

Gli hook aggiornano la dashboard in tempo reale e inviano le notifiche Telegram.

**Crea lo script hook:**

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

**Aggiungi gli hook in `~/.claude/settings.json`** (nella sezione `hooks`, accanto a quelli che hai già):

```json
"Stop":        [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<tuousername>/.claude/hooks/hook-event.sh" }] }],
"PreToolUse":  [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<tuousername>/.claude/hooks/hook-event.sh" }] }],
"PostToolUse": [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<tuousername>/.claude/hooks/hook-event.sh" }] }],
"Notification":[{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<tuousername>/.claude/hooks/hook-event.sh" }] }]
```

> Sostituisci `<tuousername>` con il tuo nome utente Windows (es. `mario.rossi.EGMSISTEMI`).

---

## 7. Installa il comando `/aggiornawiki`

Questo comando ti permette di scrivere direttamente nella wiki condivisa da qualsiasi sessione Claude Code.

```bash
mkdir -p ~/.claude/commands

cat > ~/.claude/commands/aggiornawiki.md << 'EOF'
Devi scrivere o aggiornare una pagina nella wiki Obsidian del progetto corrente.

**Passaggio 1 — Recupera configurazione wiki**

Esegui:
```bash
curl -s http://localhost:3001/api/admin/wiki-settings
```
Leggi il campo `wikiPath` dalla risposta.

**Passaggio 2 — Determina il file di destinazione**

Dal cwd corrente (esegui `pwd` se non lo conosci), calcola:
- Rimuovi il prefisso drive (`/c/` → `C:\`, oppure già Windows)
- Cartella wiki = tutto tranne l'ultimo componente del path (es. `/c/BIZ2017/BNEG0112` → cartella `BIZ2017`)
- File wiki = ultimo componente lowercase + `.md` (es. `bneg0112.md`)
- Percorso completo: `{wikiPath}/{cartella}/{file}`

**Passaggio 3 — Contenuto da documentare**

Se l'utente ha già descritto cosa documentare nel messaggio del comando, usalo.
Se non è specificato, chiedi: "Cosa vuoi documentare? Descrivi la logica, il passaggio o la decisione."

**Passaggio 4 — Scrivi nella wiki**

- Se il file esiste, leggilo prima con Read e aggiungi la nuova sezione (non duplicare heading identici)
- Se il file non esiste, crealo con intestazione `# NomeModulo` e la sezione — la cartella viene creata automaticamente dal tool Write

**Formato heading obbligatorio:**
Ogni sezione deve avere data e utente nel titolo:
```
## YYYY-MM-DD · utente · Titolo descrittivo
```
Ricava l'utente corrente con `whoami` (es. `attilio.pregnolato`).
Esempio: `## 2026-04-19 · attilio.pregnolato · Logica calcolo commissioni`

**Regole:**
- Scrivi SOLO quello che l'utente ti ha chiesto di documentare — niente inventato
- Usa tabelle Markdown per strutture dati, blocchi codice per logica/SQL/VB
- `###` per dettagli dentro la sezione datata
- Conferma all'utente il percorso del file aggiornato
EOF
```

> Non è necessario riavviare Claude Code — il comando è disponibile immediatamente.

---

## 8. Configura Obsidian sulla wiki condivisa

1. Apri Obsidian
2. **Apri cartella come vault** → seleziona `\\egmsql\EGMStruttura\Wiki-Egm`
3. La wiki è già popolata con la documentazione esistente

Da Obsidian puoi navigare, cercare e leggere tutto quello che il team ha documentato.

---

## Utilizzo quotidiano

Durante una sessione Claude Code, quando hai risolto qualcosa di interessante:

```
/aggiornawiki la logica di validazione in BNEG0128 funziona così:
controlla prima il flag ATTIVO nella tabella CLIENTI, poi verifica
la scadenza in CONTRATTI — se entrambi ok, procede con l'elaborazione
```

Claude scrive automaticamente nella wiki con data e tuo nome utente:

```markdown
## 2026-04-19 · mario.rossi · Logica validazione BNEG0128

Controlla prima il flag ATTIVO nella tabella CLIENTI, poi verifica
la scadenza in CONTRATTI — se entrambi ok, procede con l'elaborazione.
```

Il file viene creato in `\\egmsql\EGMStruttura\Wiki-Egm\BIZ2017\bneg0128.md` se non esiste, altrimenti la sezione viene aggiunta in fondo.

---

## Domande

Contatta Attilio Pregnolato per assistenza o per aggiungere nuove cartelle di progetto al monitoraggio.
