Devi analizzare l'architettura del progetto corrente e generare documentazione tecnica nella wiki Obsidian (schema Karpathy).

## Quando usarlo
- Prima volta su un progetto: genera la mappa completa
- Dopo un refactor significativo: rigenera tutto da zero
- NON usare per aggiornamenti incrementali → usa `/aggiornacodebase`
- NON usare per log di sessione → usa `/aggiornawiki`

**ATTENZIONE:** rigenera l'intera cartella `progetti/{nome}/Architettura/`. I file esistenti vengono sovrascritti. File diversi nella stessa cartella non si toccano.

---

**Passaggio 1 — Recupera il percorso wiki**

Leggi `~/.claude/wiki-config.json` ed estrai `wikiPath` (es. `/home/thomas/obsidian_second_brain/second_brain/ClaudeWiki`).

**Passaggio 2 — Identifica il progetto**

Dal cwd (esegui `pwd` se non lo conosci):
- `nome` = basename del cwd (es. `/home/thomas/Costruzione_Memory` → `Costruzione_Memory`)
- `archDir` = `{wikiPath}/progetti/{nome}/Architettura`

Crea le directory se mancanti:
```bash
mkdir -p "{wikiPath}/progetti/{nome}/Architettura"
mkdir -p "{wikiPath}/progetti/{nome}/Sessioni"
mkdir -p "{wikiPath}/progetti/{nome}/Manuali"
mkdir -p "{wikiPath}/progetti/{nome}/Rilasci"
```

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

**Passaggio 4 — Analizza ogni file**

Per ogni file:
1. Leggi con Read
2. Determina:
   - **Cosa fa:** scopo in 1-2 frasi
   - **Layer:** `api` | `service` | `data` | `ui` | `utility`
   - **Dipendenze principali:** altri file/moduli
   - **Funzioni/classi chiave:** entità principali esposte
3. Nome wiki = nome file sorgente senza estensione (`server.js` → `server.md`)
4. Se collisioni di nome (stesso basename in cartelle diverse), aggiungi parent path: `api/users.js` → `api-users.md`

**Passaggio 5 — Scrivi pagine Architettura**

Per ogni file → `{archDir}/{nome-file}.md`:

````markdown
---
layer: {api|service|data|ui|utility}
depends_on:
  - {dipendenza1}
  - {dipendenza2}
last_analyzed: {YYYY-MM-DD}
source: {percorso/relativo/al/repo}
---

# {nome-file}

## Scopo

{Cosa fa in 2-3 frasi}

## Funzioni / Classi Principali

| Nome | Descrizione |
|------|-------------|
| `{nome}` | {cosa fa} |

## Dipendenze

- `{file-o-modulo}` — {perché è usato}

## Note

{Pattern, vincoli, comportamenti non ovvi. Usa `⚠️ da verificare:` per dubbi.}
````

**Passaggio 6 — Scrivi `_overview.md`**

`{archDir}/_overview.md`:

````markdown
---
last_analyzed: {YYYY-MM-DD}
project: {nome}
---

# {nome} — Architettura

## Layer Diagram

```
[ui]       → {file-ui1}, {file-ui2}
[api]      → {file-api1}
[service]  → {file-service1}
[data]     → {file-data1}
[utility]  → {file-util1}
```

## Moduli

| File | Layer | Scopo |
|------|-------|-------|
| [[Architettura/{nome-file}\|{nome-file}]] | {layer} | {scopo breve} |

## Dipendenze Principali

{Grafico testuale delle dipendenze chiave}

## Entry Points

{File che sono punti di ingresso del sistema}
````

**Passaggio 7 — Append a `log.md` root**

Leggi `{wikiPath}/log.md` (crealo se manca con header `# Log`). Aggiungi in fondo:

```markdown
## [{YYYY-MM-DD}] /analizzacodebase | {nome} | {N} file analizzati
```

**Passaggio 8 — Aggiorna `index.md` root (MOC)**

Leggi `{wikiPath}/index.md`.

**Se non esiste**, crealo:
```markdown
---
last_updated: {YYYY-MM-DD}
---

# ClaudeWiki — Index

## Progetti

| Progetto | Architettura | Sessioni | Manuali | Rilasci |
|----------|-------------|---------|---------|---------|
| [[progetti/{nome}/Architettura/_overview\|{nome}]] | ✓ | — | — | — |
```

**Se esiste**:
1. Cerca riga `{nome}` nella tabella — se manca, appendi con `—` in tutte le colonne
2. Aggiorna colonna **Architettura**: `[[progetti/{nome}/Architettura/_overview\|✓]]`
3. Aggiorna frontmatter `last_updated: {YYYY-MM-DD}`

**Regole:**
- Naming: nome wiki = nome file sorgente senza estensione. Stabile — i link da Sessioni/ dipendono da esso.
- Audience: sviluppatori
- Conferma all'utente: numero file analizzati + path overview
- **Accuratezza:** scrivi solo ciò che è leggibile dal codice. Se ambiguo, chiedi all'utente o segnala con `⚠️ da verificare:`.
