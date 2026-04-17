import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config.js';

const API = `${API_BASE}/api/admin`;

function PathRow({ label, index, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(index);
    setDeleting(false);
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 10px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border-dim)',
      borderRadius: 6, marginBottom: 5
    }}>
      <span style={{
        flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
        color: 'var(--text-primary)', wordBreak: 'break-all'
      }}>
        {label}
      </span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Rimuovi"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,61,113,0.5)', fontSize: '0.9rem',
          padding: '2px 5px', lineHeight: 1, flexShrink: 0,
          transition: 'color 0.15s'
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,61,113,0.5)'}
      >
        {deleting ? <span className="spin" style={{ width: 10, height: 10 }} /> : '×'}
      </button>
    </div>
  );
}

export default function AdminPanel({ onClose }) {
  const [scanPaths, setScanPaths] = useState([]);
  const [excludedPaths, setExcludedPaths] = useState([]);
  const [newPath, setNewPath] = useState('');
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wikiPath, setWikiPath] = useState('');
  const [wikiPathInput, setWikiPathInput] = useState('');
  const [wikiCategories, setWikiCategories] = useState([]);
  const [savingWiki, setSavingWiki] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [newCat, setNewCat] = useState({ name: '', label: '', match: '' });
  const [addingCat, setAddingCat] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sp, ep, ws] = await Promise.all([
        fetch(`${API}/scan-paths`).then(r => r.json()),
        fetch(`${API}/excluded-paths`).then(r => r.json()),
        fetch(`${API}/wiki-settings`).then(r => r.json()),
      ]);
      setScanPaths(sp.paths || []);
      setExcludedPaths(ep.paths || []);
      setWikiPath(ws.wikiPath || '');
      setWikiPathInput(ws.wikiPath || '');
      setWikiCategories(ws.categories || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addScanPath = async () => {
    const trimmed = newPath.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      const res = await fetch(`${API}/scan-paths`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: trimmed }),
      });
      const data = await res.json();
      setScanPaths(data.paths || []);
      setNewPath('');
    } catch {}
    setAdding(false);
  };

  const deleteScanPath = async (index) => {
    try {
      const res = await fetch(`${API}/scan-paths/${index}`, { method: 'DELETE' });
      const data = await res.json();
      setScanPaths(data.paths || []);
    } catch {}
  };

  const saveWikiPath = async () => {
    setSavingWiki(true);
    try {
      const res = await fetch(`${API}/wiki-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wikiPath: wikiPathInput }),
      });
      const data = await res.json();
      if (data.success) setWikiPath(data.wikiPath);
    } catch {}
    setSavingWiki(false);
  };

  const runBackfill = async () => {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch(`${API}/wiki-backfill`, { method: 'POST' });
      const data = await res.json();
      setBackfillResult(data);
    } catch {
      setBackfillResult({ error: 'Errore avvio backfill' });
    }
    setBackfilling(false);
  };

  const addCategory = async () => {
    const { name, label, match } = newCat;
    if (!name.trim() || !label.trim() || !match.trim()) return;
    setAddingCat(true);
    try {
      const res = await fetch(`${API}/wiki-settings/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), label: label.trim(), match: match.split(',').map(s => s.trim()).filter(Boolean) }),
      });
      const data = await res.json();
      if (data.categories) { setWikiCategories(data.categories); setNewCat({ name: '', label: '', match: '' }); }
    } catch {}
    setAddingCat(false);
  };

  const deleteCategory = async (name) => {
    try {
      const res = await fetch(`${API}/wiki-settings/categories/${encodeURIComponent(name)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.categories) setWikiCategories(data.categories);
    } catch {}
  };

  const deleteExcludedPath = async (index) => {
    try {
      const res = await fetch(`${API}/excluded-paths/${index}`, { method: 'DELETE' });
      const data = await res.json();
      setExcludedPaths(data.paths || []);
    } catch {}
  };

  const rescan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch(`${API}/rescan`, { method: 'POST' });
      const data = await res.json();
      setScanResult(data);
    } catch {
      setScanResult({ error: 'Errore durante la scansione' });
    }
    setScanning(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 100,
          backdropFilter: 'blur(2px)'
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480, maxWidth: '95vw',
        background: '#0d0f18',
        borderLeft: '1px solid var(--border-subtle)',
        zIndex: 101,
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 800,
              color: 'var(--text-bright)', margin: 0, letterSpacing: '-0.01em'
            }}>
              CONFIGURAZIONE
            </h2>
            <p style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem',
              color: 'var(--text-muted)', letterSpacing: '0.1em', margin: '3px 0 0'
            }}>
              PERCORSI DI SCANSIONE
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid var(--border-subtle)',
              borderRadius: 6, color: 'var(--text-secondary)',
              fontSize: '1rem', padding: '4px 10px', cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              transition: 'border-color 0.15s, color 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-mid)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <span className="spin" style={{ width: 20, height: 20, borderWidth: 2 }} />
            </div>
          ) : (
            <>
              {/* ── Scan paths ────────────────────────── */}
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{
                    fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 700,
                    color: 'var(--text-secondary)', letterSpacing: '0.12em',
                    textTransform: 'uppercase', margin: 0
                  }}>
                    Cartelle radice
                  </h3>
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem',
                    color: 'var(--text-muted)'
                  }}>
                    {scanPaths.length} configurate
                  </span>
                </div>

                {scanPaths.length === 0 && (
                  <p style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem',
                    color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 10
                  }}>
                    // nessun percorso configurato
                  </p>
                )}

                {scanPaths.map((p, i) => (
                  <PathRow key={i} label={p} index={i} onDelete={deleteScanPath} />
                ))}

                {/* Add input */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    type="text"
                    value={newPath}
                    onChange={e => setNewPath(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addScanPath()}
                    placeholder="C:\NuovoPercorso"
                    style={{
                      flex: 1,
                      background: 'var(--bg-inset)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      transition: 'border-color 0.15s'
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--border-mid)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'}
                  />
                  <button
                    onClick={addScanPath}
                    disabled={adding || !newPath.trim()}
                    style={{
                      padding: '7px 14px',
                      background: 'var(--blue-dim)',
                      border: '1px solid var(--blue-border)',
                      borderRadius: 6, color: 'var(--blue)',
                      fontFamily: 'Syne, sans-serif', fontSize: '0.7rem',
                      fontWeight: 700, cursor: 'pointer',
                      transition: 'background 0.15s',
                      opacity: (!newPath.trim() || adding) ? 0.5 : 1
                    }}
                  >
                    {adding ? <span className="spin" /> : '+ AGGIUNGI'}
                  </button>
                </div>
              </section>

              {/* ── Rescan ────────────────────────────── */}
              <section style={{ marginBottom: 28 }}>
                <h3 style={{
                  fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 700,
                  color: 'var(--text-secondary)', letterSpacing: '0.12em',
                  textTransform: 'uppercase', margin: '0 0 12px'
                }}>
                  Scansione
                </h3>
                <p style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem',
                  color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.6
                }}>
                  Cerca nuovi progetti con sessioni Claude nelle cartelle configurate senza riavviare il server.
                </p>
                <button
                  onClick={rescan}
                  disabled={scanning || scanPaths.length === 0}
                  style={{
                    padding: '9px 18px',
                    background: scanning ? 'rgba(0,230,118,0.05)' : 'var(--green-dim)',
                    border: '1px solid var(--green-border)',
                    borderRadius: 7, color: 'var(--green)',
                    fontFamily: 'Syne, sans-serif', fontSize: '0.72rem',
                    fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'background 0.15s, box-shadow 0.15s',
                    opacity: scanPaths.length === 0 ? 0.4 : 1
                  }}
                  onMouseEnter={e => { if (!scanning) e.currentTarget.style.boxShadow = '0 0 16px var(--green-glow)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {scanning ? <span className="spin" /> : '↺'}
                  {scanning ? 'SCANSIONE IN CORSO...' : 'RISCANSIONA ORA'}
                </button>

                {scanResult && (
                  <div style={{
                    marginTop: 10,
                    padding: '10px 12px',
                    background: scanResult.error ? 'var(--red-dim)' : 'var(--green-dim)',
                    border: `1px solid ${scanResult.error ? 'var(--red-border)' : 'var(--green-border)'}`,
                    borderRadius: 6,
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem',
                    color: scanResult.error ? 'var(--red)' : 'var(--green)'
                  }}>
                    {scanResult.error
                      ? `✗ ${scanResult.error}`
                      : `✓ Trovati ${scanResult.found} progetti · ${scanResult.added} nuovi aggiunti · ${scanResult.total} totale`
                    }
                  </div>
                )}
              </section>

              {/* ── Wiki EGM ─────────────────────────── */}
              <section>
                <h3 style={{
                  fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 700,
                  color: 'var(--text-secondary)', letterSpacing: '0.12em',
                  textTransform: 'uppercase', margin: '0 0 12px'
                }}>
                  Wiki EGM
                </h3>
                <p style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem',
                  color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.6
                }}>
                  Cartella Obsidian dove vengono generate le pagine wiki dalle sessioni.
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input
                    value={wikiPathInput}
                    onChange={e => setWikiPathInput(e.target.value)}
                    placeholder="C:\EGM-Wiki"
                    style={{
                      flex: 1, background: 'var(--input-bg)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '6px 10px', color: 'var(--text-primary)',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
                    }}
                  />
                  <button
                    onClick={saveWikiPath}
                    disabled={savingWiki || wikiPathInput === wikiPath}
                    style={{
                      background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                      borderRadius: 6, padding: '6px 14px', cursor: 'pointer',
                      fontFamily: 'Syne, sans-serif', fontSize: '0.68rem', fontWeight: 700,
                      color: 'var(--accent)', letterSpacing: '0.08em',
                      opacity: (savingWiki || wikiPathInput === wikiPath) ? 0.5 : 1,
                    }}
                  >
                    {savingWiki ? <span className="spin" /> : 'SALVA'}
                  </button>
                </div>
                <button
                  onClick={runBackfill}
                  disabled={backfilling}
                  style={{
                    background: 'var(--green-dim)', border: '1px solid var(--green-border)',
                    borderRadius: 6, padding: '7px 16px', cursor: 'pointer',
                    fontFamily: 'Syne, sans-serif', fontSize: '0.68rem', fontWeight: 700,
                    color: 'var(--green)', letterSpacing: '0.08em',
                    opacity: backfilling ? 0.5 : 1,
                  }}
                >
                  {backfilling ? 'AVVIO IN CORSO...' : '⚡ GENERA WIKI DA SESSIONI'}
                </button>
                {backfillResult && (
                  <div style={{
                    marginTop: 8, padding: '6px 10px',
                    background: backfillResult.error ? 'var(--red-dim)' : 'var(--green-dim)',
                    border: `1px solid ${backfillResult.error ? 'var(--red-border)' : 'var(--green-border)'}`,
                    borderRadius: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem',
                    color: backfillResult.error ? 'var(--red)' : 'var(--green)'
                  }}>
                    {backfillResult.error ? `✗ ${backfillResult.error}` : `✓ ${backfillResult.message}`}
                  </div>
                )}

                {/* ── Categorie wiki ── */}
                <div style={{ marginTop: 20 }}>
                  <p style={{
                    fontFamily: 'Syne, sans-serif', fontSize: '0.68rem', fontWeight: 700,
                    color: 'var(--text-secondary)', letterSpacing: '0.1em',
                    textTransform: 'uppercase', margin: '0 0 8px'
                  }}>Categorie</p>
                  {wikiCategories.map(cat => (
                    <div key={cat.name} style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                      padding: '5px 8px', background: 'var(--card-bg)',
                      border: '1px solid var(--border)', borderRadius: 6,
                    }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--accent)', minWidth: 110 }}>{cat.name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--text-muted)', flex: 1 }}>{cat.match.join(', ')}</span>
                      <button onClick={() => deleteCategory(cat.name)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '0.75rem', padding: '2px 6px',
                      }}>×</button>
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: 6, marginTop: 8 }}>
                    <input value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                      placeholder="name (es. backend)" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem' }} />
                    <input value={newCat.label} onChange={e => setNewCat(p => ({ ...p, label: e.target.value }))}
                      placeholder="label (es. Backend)" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem' }} />
                    <input value={newCat.match} onChange={e => setNewCat(p => ({ ...p, match: e.target.value }))}
                      placeholder="pattern separati da virgola" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem' }} />
                    <button onClick={addCategory} disabled={addingCat} style={{
                      background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
                      borderRadius: 6, padding: '5px 12px', cursor: 'pointer',
                      fontFamily: 'Syne, sans-serif', fontSize: '0.68rem', fontWeight: 700,
                      color: 'var(--accent)', opacity: addingCat ? 0.5 : 1,
                    }}>
                      {addingCat ? <span className="spin" /> : '+ AGGIUNGI'}
                    </button>
                  </div>
                </div>
              </section>

              {/* ── Percorsi esclusi ──────────────────── */}
              {excludedPaths.length > 0 && (
                <section>
                  <h3 style={{
                    fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 700,
                    color: 'var(--text-secondary)', letterSpacing: '0.12em',
                    textTransform: 'uppercase', margin: '0 0 12px'
                  }}>
                    Percorsi esclusi ({excludedPaths.length})
                  </h3>
                  <p style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem',
                    color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.6
                  }}>
                    Rimossi tramite il bottone ⊗ sulle card. Clicca × per ripristinare.
                  </p>
                  {excludedPaths.map((p, i) => (
                    <PathRow key={i} label={p} index={i} onDelete={deleteExcludedPath} />
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
