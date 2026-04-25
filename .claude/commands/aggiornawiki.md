Devi aggiungere una voce di sessione nella wiki Obsidian del progetto corrente (schema Karpathy).

## Quando usarlo
- Dopo ogni sessione significativa: bug fix, feature, decisione architettuale
- NON usare per: documentazione utente → usa `/aggiornamanuale`
- NON usare per: note di rilascio → usa `/aggiornarilasci`
- NON usare per: analisi strutturale del codice → usa `/analizzacodebase`

---

**Passaggio 1 — Recupera il percorso wiki**

Leggi `~/.claude/wiki-config.json` ed estrai `wikiPath`.

**Passaggio 2 — Determina file di destinazione**

Dal cwd:
- `nome` = basename del cwd
- `data` = `date +%Y-%m-%d`
- `sessDir` = `{wikiPath}/progetti/{nome}/Sessioni`
- File: `{sessDir}/{data}.md` (una sessione per giorno)

Crea dir se manca: `mkdir -p "{sessDir}"`.

**Passaggio 3 — Contenuto da documentare**

Se l'utente ha descritto cosa documentare nel messaggio del comando, usalo. Altrimenti chiedi: *"Cosa è stato fatto? Descrivi modifiche o decisioni di questa sessione."*

Ricava utente: `whoami`.

**Passaggio 4 — Scrivi nel file**

**Se il file non esiste:** crea con frontmatter + prima sezione:

```markdown
---
date: {YYYY-MM-DD}
project: {nome}
---

# Sessioni — {YYYY-MM-DD}

## {Titolo breve dell'intervento}

{Cosa è stato fatto, perché, cosa è cambiato}

> *Cronologia: {YYYY-MM-DD HH:MM} {utente} — prima stesura*
```

**Se il file esiste:** Read del file, poi:
- Cerca sezione `##` semanticamente equivalente
- **Trovata:** appendi voce cronologia in fondo alla sezione: `· {HH:MM} {utente} — {nota breve}` e aggiorna contenuto se necessario
- **Non trovata:** appendi nuova sezione `##` in fondo con cronologia iniziale

**Passaggio 5 — Wikilink cross-area (opzionale)**

Se esiste `{wikiPath}/progetti/{nome}/Architettura/_overview.md`, aggiungi in fondo alla sezione:
```
→ Vedi: [[progetti/{nome}/Architettura/_overview]]
```

**Passaggio 6 — Append a `log.md` root**

```markdown
## [{YYYY-MM-DD}] /aggiornawiki | {nome} | {nota breve}
```

**Passaggio 7 — Aggiorna `index.md` root**

Aggiorna riga `{nome}` colonna **Sessioni**: `[[progetti/{nome}/Sessioni|✓]]` (link alla cartella, non al singolo file giorno).
Se riga assente, appendi con `—` nelle altre colonne.
Aggiorna `last_updated`.

**Regole:**
- Scrivi cosa è cambiato e perché — non solo "aggiornato X"
- Usa code block per snippet rilevanti (SQL, JS, config)
- File giorno = unica fonte di sessioni per quella data — sezioni multiple OK
- NON aggiornare manuale — usa `/aggiornamanuale`
- Conferma all'utente: path file + se nuovo/aggiornato
