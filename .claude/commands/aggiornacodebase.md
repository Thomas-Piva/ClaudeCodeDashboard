Devi aggiornare incrementalmente la documentazione architetturale nella wiki Obsidian (schema Karpathy), analizzando solo i file sorgente cambiati dall'ultima analisi.

## Quando usarlo
- Dopo modifiche puntuali: aggiorna solo i file toccati
- NON usare per la prima analisi → usa `/analizzacodebase`
- NON usare dopo refactor grossi (rinominazioni, ristrutturazioni) → usa `/analizzacodebase`

**Nota:** gestisce dipendenze cross-file tramite propagazione inversa di `depends_on`. Dipendenze implicite non documentate non vengono rilevate.

---

**Passaggio 1 — Recupera il percorso wiki**

Leggi `~/.claude/wiki-config.json` ed estrai `wikiPath`.

**Passaggio 2 — Identifica il progetto**

Dal cwd:
- `nome` = basename del cwd
- `archDir` = `{wikiPath}/progetti/{nome}/Architettura`

Se `archDir` non esiste, avvisa l'utente: *"Documentazione architettura assente. Esegui prima `/analizzacodebase`."*

**Passaggio 3 — Scansiona file sorgente**

```bash
find . -type f \( -iname "*.js" -o -iname "*.ts" -o -iname "*.jsx" -o -iname "*.tsx" -o -iname "*.py" -o -iname "*.go" -o -iname "*.rs" -o -iname "*.cs" -o -iname "*.vb" -o -iname "*.java" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -path "*/build/*" \
  ! -path "*/vendor/*" \
  ! -path "*/.git/*" \
  ! -path "*/__pycache__/*" \
  ! -path "*/target/*"
```

**Passaggio 4 — Classifica ogni file**

Per ogni file determina:

**A) Nuovo** — il wiki doc `{archDir}/{nome-file}.md` non esiste → `da_analizzare`

**B) Modificato** — il wiki doc esiste. Confronta timestamp:
```bash
git log --format="%ai" -1 -- {percorso-file}
```
Se data git > `last_analyzed` nel frontmatter → `da_analizzare`.
Se untracked, usa `stat -c "%y" {percorso-file}`.

**C) Invariato** — data git ≤ `last_analyzed` → skip

**Passaggio 5 — File orfani**

Lista i `.md` in `{archDir}/` (escludi `_overview.md`). Per ogni doc, verifica esistenza file sorgente. Se manca → `orfani` (solo segnala, non eliminare).

**Passaggio 6 — Propagazione inversa dipendenze**

Per ogni file in `da_analizzare`, ricava il nome base. Per ogni doc in `{archDir}/`:
- Leggi frontmatter
- Se `depends_on` contiene il nome base → aggiungi quel sorgente a `da_analizzare`

Max 2 iterazioni per evitare loop.

**Passaggio 7 — Analizza file in `da_analizzare`**

Per ognuno:
1. Read del file
2. Determina layer, dipendenze, funzioni/classi chiave
3. Scrivi/sovrascrivi `{archDir}/{nome-file}.md`:

````markdown
---
layer: {api|service|data|ui|utility}
depends_on:
  - {dipendenza1}
last_analyzed: {YYYY-MM-DD}
source: {percorso/relativo}
---

# {nome-file}

## Scopo

{2-3 frasi}

## Funzioni / Classi Principali

| Nome | Descrizione |
|------|-------------|
| `{nome}` | {cosa fa} |

## Dipendenze

- `{file-o-modulo}` — {perché}

## Note

{Pattern, vincoli. Usa `⚠️ da verificare:` per dubbi.}
````

**Passaggio 8 — Rigenera `_overview.md`**

Se almeno 1 file aggiornato, rigenera `{archDir}/_overview.md` leggendo i frontmatter di tutti i doc esistenti (no rilettura sorgenti):

````markdown
---
last_analyzed: {YYYY-MM-DD}
project: {nome}
---

# {nome} — Architettura

## Layer Diagram

```
[ui]       → ...
[api]      → ...
[service]  → ...
[data]     → ...
[utility]  → ...
```

## Moduli

| File | Layer | Scopo |
|------|-------|-------|
| [[Architettura/{nome-file}\|{nome-file}]] | {layer} | {scopo breve} |

## Dipendenze Principali

{Grafico testuale}

## Entry Points

{File entry}
````

**Passaggio 9 — Append a `log.md` root**

```markdown
## [{YYYY-MM-DD}] /aggiornacodebase | {nome} | {N} aggiornati, {N} nuovi, {N} orfani
```

**Passaggio 10 — Aggiorna `index.md` root**

Aggiorna riga `{nome}` colonna **Architettura** (se non già presente). Aggiorna `last_updated`.

**Passaggio 11 — Rapporto finale**

- `{N}` aggiornati: lista nomi
- `{N}` nuovi: lista nomi
- `{N}` invariati: solo conteggio
- `{N}` orfani: lista + avviso "verificare se eliminare manualmente"
- Path overview: `{archDir}/_overview.md`

**Regole:**
- Non eliminare wiki doc automaticamente — solo segnala orfani
- Naming stabile: nome wiki = nome sorgente senza estensione
- Propagazione limitata a 2 iter
- **Accuratezza:** solo ciò che è leggibile dal codice. Ambiguo → chiedi o `⚠️ da verificare:`
