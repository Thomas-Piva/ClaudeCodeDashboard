Devi creare una nota di rilascio nella wiki Obsidian (schema Karpathy).

## Quando usarlo
- Prima o dopo un deploy: include artefatti, modifiche DB, istruzioni installazione
- NON usare per: log di sessione → usa `/aggiornawiki`
- NON usare per: documentazione utente → usa `/aggiornamanuale`

---

**Passaggio 1 — Recupera il percorso wiki**

Leggi `~/.claude/wiki-config.json` ed estrai `wikiPath`.

**Passaggio 2 — Determina file e versione**

Dal cwd:
- `nome` = basename del cwd
- `relDir` = `{wikiPath}/progetti/{nome}/Rilasci`
- `versione` = argomento del comando (es. `/aggiornarilasci 1.3.0`). Se non specificata, chiedi: *"Numero di versione del rilascio?"*
- File: `{relDir}/v{versione}.md`

Crea dir se manca: `mkdir -p "{relDir}"`.

**Passaggio 3 — Raccogli informazioni**

Se l'utente ha fornito dettagli nel messaggio, usali. Altrimenti chiedi:
1. *"Quali artefatti vanno deployati? (binari, DLL, container, immagini Docker — nome, percorso, note)"*
2. *"Modifiche a tabelle/schema database?"*
3. *"Funzionamento della nuova versione?"*
4. *"Note aggiuntive o dipendenze da altri rilasci?"*

Ricava data e utente:
```bash
date +%Y-%m-%d
whoami
```

**Passaggio 4 — Crea il file**

Una versione = un file. Se esiste già, avvisa l'utente: *"File `v{versione}.md` esiste già. Sovrascrivere?"*.

Struttura:
```markdown
---
project: {nome}
version: {versione}
date: {YYYY-MM-DD}
author: {utente}
---

# Note Rilascio — v{versione}

**Progetto:** {nome}
**Data:** {YYYY-MM-DD}
**Autore:** {utente}

## Artefatti

| Nome | Percorso | Note |
|------|----------|------|
| `{artefatto}` | `{path}` | {note} |

## Modifiche Database

| Tabella | Campo | Tipo | Nullable | Note |
|---------|-------|------|----------|------|
| `{tabella}` | `{campo}` | `{tipo}` | sì/no | {note} |

(omettere sezione se nessuna modifica DB)

## Funzionamento

{Descrizione step-by-step + risultato atteso}

## Note Aggiuntive

{Dipendenze altri rilasci, breaking changes, rollback}
```

**Passaggio 5 — Wikilink cross-area**

- Se esiste `{wikiPath}/progetti/{nome}/Architettura/database.md` e ci sono modifiche DB:
  ```
  → Schema DB: [[progetti/{nome}/Architettura/database]]
  ```
- Se esiste qualche file in `{wikiPath}/progetti/{nome}/Manuali/`:
  ```
  → Manuale: [[progetti/{nome}/Manuali]]
  ```

**Passaggio 6 — Append a `log.md` root**

```markdown
## [{YYYY-MM-DD}] /aggiornarilasci | {nome} | v{versione}
```

**Passaggio 7 — Aggiorna `index.md` root**

Aggiorna riga `{nome}` colonna **Rilasci**: `[[progetti/{nome}/Rilasci/v{versione}\|v{versione}]]` (link all'ultima versione, sempre aggiorna).
Aggiorna `last_updated`.

**Regole:**
- Audience: IT/sviluppatori che installano — non utenti finali
- Sii preciso su percorsi/path (assoluti)
- Modifiche tabelle: tipo dato + nullable
- Conferma all'utente: path file creato
