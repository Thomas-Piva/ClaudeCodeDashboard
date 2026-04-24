Devi analizzare l'architettura del progetto corrente e generare documentazione tecnica nella wiki Obsidian.

## Quando usarlo
- Prima volta su un progetto: genera la mappa completa
- Dopo un refactor significativo: rigenera tutto da zero
- NON usare per aggiornamenti incrementali → usa /aggiornawiki

**ATTENZIONE:** questo comando rigenera l'intera cartella `Architettura/{progetto}/`. I file esistenti vengono sovrascritti.

---

**Passaggio 1 — Recupera il percorso wiki**

Leggi il file:
`C:\Users\attilio.pregnolato.EGMSISTEMI\.claude\wiki-config.json`

Estrai il campo `wikiPath`.

**Passaggio 2 — Identifica il progetto**

Dal cwd corrente (esegui `pwd` se non lo conosci), calcola:
- Normalizza il path: `/c/BIZ2017/BNEG0112` → `C:\BIZ2017\BNEG0112`
- `cartella` = penultimo componente (es. `BIZ2017`)
- `modulo` = ultimo componente lowercase (es. `bneg0112`)
- Directory radice da analizzare = cwd completo

**Passaggio 3 — Scansiona i file sorgente**

Elenca i file sorgente nella directory corrente (ricorsivo):
```bash
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.cs" -o -name "*.vb" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -path "*/build/*" \
  ! -path "*/vendor/*" \
  ! -path "*/.git/*"
```

**Passaggio 4 — Analizza ogni file**

Per ogni file trovato:
1. Leggi il contenuto con Read
2. Determina:
   - **Cosa fa:** scopo del file in 1-2 frasi
   - **Layer architetturale:** `api` | `service` | `data` | `ui` | `utility`
   - **Dipendenze principali:** altri file o moduli da cui dipende
   - **Funzioni/classi chiave:** lista delle entità principali esposte
3. Il nome del file wiki = nome file sorgente senza estensione (es. `server.js` → `server.md`)

**Passaggio 5 — Scrivi le pagine Architettura**

Per ogni file analizzato, scrivi `{wikiPath}\Architettura\{cartella}\{nome-file}.md`:

````markdown
---
layer: {api|service|data|ui|utility}
depends_on:
  - {dipendenza1}
  - {dipendenza2}
last_analyzed: {YYYY-MM-DD}
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

{Eventuali dettagli rilevanti: pattern usati, vincoli, comportamenti non ovvi}
````

**Passaggio 6 — Scrivi l'overview**

Scrivi `{wikiPath}\Architettura\{cartella}\_overview.md`:

````markdown
---
last_analyzed: {YYYY-MM-DD}
---

# {modulo} — Architettura

## Layer Diagram

```
[ui]       → {file-ui1}, {file-ui2}
[api]      → {file-api1}
[service]  → {file-service1}, {file-service2}
[data]     → {file-data1}
[utility]  → {file-util1}
```

## Moduli

| File | Layer | Scopo |
|------|-------|-------|
| [[{nome-file}]] | {layer} | {scopo breve} |

## Dipendenze Principali

{Grafico testuale delle dipendenze più importanti}

## Entry Points

{Quali file sono i punti di ingresso del sistema}
````

**Passaggio 7 — Aggiungi wikilinks verso Sessioni/**

Controlla se esistono file in `{wikiPath}\Sessioni\{cartella}\`.
Se esistono, aggiungi nell'`_overview.md`:
```markdown
## Sessioni di lavoro

- [[Sessioni/{cartella}/{modulo}]]
```

**Regole:**
- Naming convention stabile: nome wiki = nome file sorgente senza estensione. Non cambiare mai questo nome — i link da Sessioni/ dipendono da esso.
- Audience: sviluppatori tecnici
- Conferma all'utente quanti file analizzati e il percorso dell'overview
