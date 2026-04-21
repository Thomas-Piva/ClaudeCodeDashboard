Devi aggiungere una voce di changelog nella wiki Obsidian del progetto corrente.

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
- Progetto = ultimo componente lowercase (es. `bneg0112`)
- Ricava la data odierna: `date +%Y-%m-%d`
- Percorso completo: `{wikiPath}/{cartella}/{progetto}/aggiornamenti/{YYYY-MM-DD}.md`

**Passaggio 3 — Contenuto da documentare**

Se l'utente ha già descritto cosa documentare nel messaggio del comando, usalo.
Se non è specificato, chiedi: *"Cosa è stato fatto? Descrivi le modifiche o le decisioni di questa sessione."*

Ricava utente: `whoami`

**Passaggio 4 — Scrivi il changelog**

**Se il file non esiste:** crealo con questo formato:
```
# Aggiornamenti {YYYY-MM-DD}

**Progetto:** {progetto}
**Autore:** {utente}

## {Titolo breve dell'intervento}

{Descrizione di cosa è stato fatto, perché, e cosa ha cambiato}
```

**Se il file esiste già (stesso giorno):** leggilo con Read, poi aggiungi in fondo una nuova sezione `##` con il nuovo intervento.

**Regole:**
- Ogni sezione `##` descrive un intervento distinto della sessione
- Scrivi cosa è cambiato e perché — non solo "aggiornato X"
- Usa blocchi codice per snippet SQL/VB/config rilevanti
- Usa elenchi puntati per modifiche multiple
- NON aggiornare il manuale del progetto — per quello usa `/aggiornamanuale`
- Conferma all'utente il percorso del file e se è nuovo o aggiornato
