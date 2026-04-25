Esegui graphify per costruire grafo deterministico AST + concetti del progetto corrente. Sincronizza output nel vault Karpathy. Prima volta su un progetto.

## Quando usarlo
- Prima volta che applichi graphify a un progetto
- NON usare per aggiornamenti → usa `/aggiornagraphify`

---

**Passaggio 1 — Verifica install**

```bash
command -v graphify >/dev/null 2>&1 || {
  echo "❌ graphify non installato. Installa con:"
  echo "    pip install graphifyy && graphify install"
  echo ""
  echo "Note:"
  echo "  - Pacchetto PyPI: 'graphifyy' (double y) — 'graphify' è unaffiliated"
  echo "  - 'graphify install' opzionale (configura skill auto-trigger). Per slash command basta CLI."
  exit 1
}
```

**Passaggio 2 — Recupera percorso wiki**

Leggi `~/.claude/wiki-config.json` ed estrai `wikiPath`.

**Passaggio 3 — Identifica progetto**

Dal cwd (esegui `pwd`):
- `nome` = basename del cwd (es. `Costruzione_Memory`)
- `graphDir` = `{wikiPath}/progetti/{nome}/Graphify`

**Passaggio 4 — Esegui graphify (estrazione AST, zero LLM)**

```bash
graphify update .
```

CLI deterministica: solo estrazione AST tree-sitter, no LLM, no token cost.

Output generato in `<cwd>/graphify-out/`:
- `graph.html` — interactive viewer (apri in browser)
- `GRAPH_REPORT.md` — god nodes + sintesi narrativa
- `graph.json` — grafo persistente queryable
- `cache/` — SHA256 cache (NON sync)

> Per estrazione semantica completa (docs, papers, immagini con LLM subagents) installa skill ufficiale: `graphify install`. Lo slash command nostro fa solo AST.

**Passaggio 5 — Sync nel vault**

```bash
mkdir -p "{graphDir}"
rsync -a --delete \
  --exclude 'cache/' \
  ./graphify-out/ "{graphDir}/"
```

`--delete` rimuove file orfani in `Graphify/` non più presenti in `graphify-out/`. Esclusa `cache/` (SHA256 locale).

**Passaggio 6 — Append a `log.md` root**

Append a `{wikiPath}/log.md`:

```markdown
## [{YYYY-MM-DD}] graphify | {nome} | primo ingest
```

**Passaggio 7 — Aggiorna `index.md` root MOC**

Leggi `{wikiPath}/index.md`. Tabella progetti ha 5 colonne: `Architettura | Sessioni | Manuali | Rilasci`.

**Aggiungi colonna Graphify se manca:**

```markdown
| Progetto | Architettura | Sessioni | Manuali | Rilasci | Graphify |
|----------|-------------|---------|---------|---------|----------|
```

**Aggiorna riga `{nome}`:**
- Se manca → appendi con `—` nelle altre colonne
- Colonna **Graphify**: `[[progetti/{nome}/Graphify/GRAPH_REPORT\|✓]]`

Aggiorna frontmatter `last_updated: {YYYY-MM-DD}`.

**Passaggio 8 — Conferma**

Comunica all'utente:
- Path `Graphify/` creato
- Numero nodi (estraibile da `GRAPH_REPORT.md` o `graph.json`)
- Suggerimento: `graph.html` apribile in browser per visualizzazione interattiva

**Regole:**
- Sync `graphify-out/` → `Graphify/` con rsync `--delete`
- Skip cache/, manifest.json, cost.json
- NON committare `graphify-out/` nel repo del progetto sorgente — è artefatto generato (aggiungi a `.gitignore` del progetto)
- File `Graphify/` letti da Claude prima dell'analisi narrativa di `Architettura/` — vedi ordine lettura in `CLAUDE.md`
