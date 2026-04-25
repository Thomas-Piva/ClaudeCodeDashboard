Aggiorna incrementalmente il grafo graphify del progetto corrente. Sessioni successive alla prima.

## Quando usarlo
- Dopo modifiche al codice del progetto
- NON usare per la prima volta → usa `/graphify`

**Nota:** graphify usa SHA256 cache → re-run è quasi istantaneo se nulla è cambiato. `--update` è la forma esplicita per aggiornamenti incrementali.

---

**Passaggio 1 — Verifica install**

```bash
command -v graphify >/dev/null 2>&1 || {
  echo "❌ graphify non installato. Installa con:"
  echo "    pip install graphifyy && graphify install"
  exit 1
}
```

**Passaggio 2 — Recupera percorso wiki**

Leggi `~/.claude/wiki-config.json` ed estrai `wikiPath`.

**Passaggio 3 — Identifica progetto**

Dal cwd:
- `nome` = basename del cwd
- `graphDir` = `{wikiPath}/progetti/{nome}/Graphify`

Se `graphDir` non esiste, avvisa: *"Graphify non inizializzato per questo progetto. Esegui prima `/graphify`."*

**Passaggio 4 — Esegui update incrementale**

```bash
graphify update .
```

Aggiorna `<cwd>/graphify-out/`:
- File modificati ri-processati (delta SHA256)
- File invariati skipati
- Solo AST tree-sitter, no LLM

**Passaggio 5 — Sync nel vault**

```bash
rsync -a --delete \
  --exclude 'cache/' \
  ./graphify-out/ "{graphDir}/"
```

**Passaggio 6 — Append a `log.md` root**

```markdown
## [{YYYY-MM-DD}] graphify update | {nome} | aggiornamento
```

**Passaggio 7 — Index.md (no-op se già presente)**

Riga `{nome}` colonna **Graphify** dovrebbe già essere `[[progetti/{nome}/Graphify/GRAPH_REPORT\|✓]]` da `/graphify` precedente. Verifica + lascia invariato.

Aggiorna `last_updated: {YYYY-MM-DD}`.

**Passaggio 8 — Conferma**

Comunica:
- Numero nodi totali nel grafo aggiornato
- Numero file delta processati (estraibile da output graphify)

**Regole:**
- Idempotente: re-run consecutivi senza modifiche = no-op effettivo (cache hit 100%)
- `--delete` rsync rimuove output orfani — coerente con re-extraction
- File `Graphify/` letti da Claude prima dell'analisi narrativa
