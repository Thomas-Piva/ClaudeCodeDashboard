Devi scrivere o aggiornare il manuale del progetto nella wiki Obsidian del progetto corrente.

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

Questo è il manuale principale del progetto — descrive cos'è, come funziona, le sue logiche.

**Passaggio 3 — Contenuto da documentare**

Se l'utente ha già descritto cosa documentare nel messaggio del comando, usalo.
Se non è specificato, chiedi: *"Cosa vuoi documentare nel manuale? Descrivi la logica, l'architettura o la procedura."*

Ricava data e utente:
```bash
date +%Y-%m-%d
whoami
```

**Passaggio 4 — Scrivi nel manuale**

**Se il file non esiste:** crealo con intestazione `# NomeProgetto` e la nuova sezione nel formato sotto.

**Se il file esiste:** leggilo con Read, poi:

- Cerca se esiste già una sezione `##` il cui titolo descrive la **stessa procedura/argomento** di quello che stai documentando (confronto semantico, non esatto).

  **Sezione esistente trovata → AGGIORNA IN-PLACE:**
  - Riscrivi il contenuto della sezione con le informazioni aggiornate (unisci vecchio + nuovo, tieni ciò che è ancora valido)
  - Trova la riga cronologia `> *Cronologia:` in fondo alla sezione e aggiungi la nuova voce:
    `· YYYY-MM-DD utente — descrizione modifica`
  - Se la riga cronologia non esiste ancora, aggiungila:
    `> *Cronologia: YYYY-MM-DD utente — prima stesura*`

  **Sezione non trovata → AGGIUNGI NUOVA:**
  - Appendi la nuova sezione in fondo al file nel formato:
  ```
  ## Titolo descrittivo della procedura

  <contenuto>

  > *Cronologia: YYYY-MM-DD utente — prima stesura*
  ```

**Regole:**
- Scrivi SOLO quello che l'utente ti ha chiesto di documentare — niente inventato
- Usa tabelle Markdown per strutture dati, blocchi codice per logica/SQL/VB
- `###` per dettagli dentro la sezione
- Il titolo della sezione descrive la procedura/argomento (es. `## Logica calcolo commissioni`), NON include la data — quella va solo nella cronologia
- NON scrivere changelog di sessione — per quello usa `/aggiornawiki`
- Conferma all'utente il percorso del file e se hai aggiornato una sezione esistente o creato una nuova
