Devi scrivere o aggiornare il manuale del progetto nella wiki Obsidian (schema Karpathy).

## Quando usarlo
- Quando cambia come si usa il software: nuova feature visibile, cambio workflow
- NON usare per: log di sessione → usa `/aggiornawiki`
- NON usare per: DLL/tabelle DB/note rilascio → usa `/aggiornarilasci`
- NON usare per: analisi strutturale del codice → usa `/analizzacodebase`

---

**Passaggio 1 — Recupera il percorso wiki**

Leggi `~/.claude/wiki-config.json` ed estrai `wikiPath`.

**Passaggio 2 — Determina file di destinazione**

Dal cwd:
- `nome` = basename del cwd
- `manDir` = `{wikiPath}/progetti/{nome}/Manuali`
- `area` = ricava da contesto utente o chiedi: *"Quale area del manuale? (es. `installazione`, `configurazione`, `troubleshooting`, `workflow-base`)"*
- File: `{manDir}/{area}.md`

Crea dir se manca: `mkdir -p "{manDir}"`.

**Passaggio 3 — Contenuto**

Se l'utente ha descritto cosa documentare, usalo. Altrimenti chiedi: *"Cosa documentare nel manuale? Procedura, configurazione, errori comuni?"*

Ricava data e utente:
```bash
date +%Y-%m-%d
whoami
```

**Passaggio 4 — Scrivi nel manuale**

**Se il file non esiste:** crea con struttura:

```markdown
---
project: {nome}
area: {area}
last_updated: {YYYY-MM-DD}
audience: {sviluppatori|utenti|admin}
---

# Manuale — {area}

> Riferimento tecnico: [[progetti/{nome}/Architettura/_overview]] (se esiste)

## Indice

- [Titolo sezione 1](#titolo-sezione-1)

## {Titolo sezione 1}

{Procedura step-by-step, mockup ASCII se utili, esempi.}

> *Cronologia: {YYYY-MM-DD} {utente} — prima stesura*
```

**Se il file esiste:** Read, poi:
- Cerca sezione `##` semanticamente equivalente
- **Trovata:** unisci vecchio + nuovo, aggiorna cronologia: `· {YYYY-MM-DD} {utente} — descrizione`
- **Non trovata:** appendi nuova sezione + voce nell'indice
- Aggiorna frontmatter `last_updated`

**Passaggio 5 — Wikilink cross-area**

Se esiste `{wikiPath}/progetti/{nome}/Architettura/_overview.md` e non già linkato, aggiungi in testa al file:
```
> Riferimento tecnico: [[progetti/{nome}/Architettura/_overview]]
```

**Passaggio 6 — Append a `log.md` root**

```markdown
## [{YYYY-MM-DD}] /aggiornamanuale | {nome} | {area}: {nota breve}
```

**Passaggio 7 — Aggiorna `index.md` root**

Aggiorna riga `{nome}` colonna **Manuali**: `[[progetti/{nome}/Manuali|✓]]` (link alla cartella).
Aggiorna `last_updated`.

**Regole:**
- Scrivi SOLO ciò che l'utente ha chiesto di documentare
- Usa tabelle Markdown per strutture dati, code block per logica/SQL
- Titolo sezione descrive procedura (es. `## Logica calcolo commissioni`), NON include data
- NON scrivere log di sessione — usa `/aggiornawiki`
- Conferma all'utente: path + se aggiornato/creato
