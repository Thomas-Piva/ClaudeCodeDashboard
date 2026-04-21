# Guida: Dashboard Claude Code + Wiki EGM

Questa guida ti permette di collegare il tuo Claude Code alla dashboard condivisa e alla wiki tecnica del team.

---

## Cosa ottieni

- **Dashboard** su `http://localhost:5173` — vedi tutte le tue sessioni Claude Code attive, le cerchi, le esporti
- **Notifiche Telegram** — ricevi un messaggio quando una sessione finisce o va in errore
- **Wiki condivisa** su `\\egmsql\EGMStruttura\Wiki-Egm` — documentazione tecnica dei moduli, aggiornata da tutti i colleghi con `/aggiornawiki` (changelog) e `/aggiornamanuale` (manuale progetto)

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

## 7. Comandi wiki `/aggiornawiki` e `/aggiornamanuale`

I comandi sono già inclusi nel repository in `.claude/commands/` — **non serve installarli manualmente**.

Claude Code li carica automaticamente quando lavori in questa cartella o in qualsiasi sottocartella del repo.

| Comando | Dove scrive | Quando usarlo |
|---------|-------------|---------------|
| `/aggiornawiki` | `Wiki/{cartella}/{progetto}/aggiornamenti/YYYY-MM-DD.md` | Changelog di sessione — cosa hai fatto e perché |
| `/aggiornamanuale` | `Wiki/{cartella}/{progetto}.md` | Manuale del progetto — logiche, architettura, procedure |

> Se usi i comandi da un progetto **fuori** da questo repo, copia i file in `~/.claude/commands/`:
> ```bash
> cp .claude/commands/aggiornawiki.md ~/.claude/commands/
> cp .claude/commands/aggiornamanuale.md ~/.claude/commands/
> ```

---

## 8. Configura Obsidian sulla wiki condivisa

1. Apri Obsidian
2. **Apri cartella come vault** → seleziona `\\egmsql\EGMStruttura\Wiki-Egm`
3. La wiki è già popolata con la documentazione esistente

Da Obsidian puoi navigare, cercare e leggere tutto quello che il team ha documentato.

---

## Utilizzo quotidiano

### Registrare cosa hai fatto in sessione → `/aggiornawiki`

```
/aggiornawiki la logica di validazione in BNEG0128 funziona così:
controlla prima il flag ATTIVO nella tabella CLIENTI, poi verifica
la scadenza in CONTRATTI — se entrambi ok, procede con l'elaborazione
```

Crea/aggiorna `Wiki-Egm\BIZ2017\bneg0128\aggiornamenti\2026-04-19.md` con la voce della sessione.

### Documentare la logica del progetto → `/aggiornamanuale`

```
/aggiornamanuale il modulo BNEG0128 gestisce la validazione dei contratti:
query su CLIENTI + CONTRATTI, flag ATTIVO, scadenza, poi elaborazione
```

Crea/aggiorna `Wiki-Egm\BIZ2017\bneg0128.md` — sezione semantica, aggiornamento in-place se l'argomento esiste già.

---

## Domande

Contatta Attilio Pregnolato per assistenza o per aggiungere nuove cartelle di progetto al monitoraggio.
