import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config.js';

// Escape HTML entities to prevent XSS before injecting <mark> spans
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Build safe highlighted HTML from FTS5 snippet.
// The snippet may contain raw <mark>...</mark> injected by SQLite.
// We escape all content, then restore only the <mark> spans.
function buildSnippetHtml(snippet) {
  if (!snippet) return '';
  // Split on <mark> and </mark> literals from FTS5
  // The snippet from the backend uses literal <mark> and </mark> as delimiters
  // We need to escape all parts, then re-add safe <mark> spans
  const parts = snippet.split(/(<mark>|<\/mark>)/);
  let inMark = false;
  let html = '';
  for (const part of parts) {
    if (part === '<mark>') { inMark = true; html += '<mark style="background:rgba(251,191,36,0.3);color:#fbbf24;border-radius:2px">'; }
    else if (part === '</mark>') { inMark = false; html += '</mark>'; }
    else { html += escHtml(part); }
  }
  return html;
}

function fmt(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SearchBar({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=12`);
        const data = await res.json();
        setResults(data);
        setSelected(0);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(v => Math.min(v + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(v => Math.max(v - 1, 0)); }
    if (e.key === 'Enter' && results[selected]) { onSelect(results[selected].session_id); }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 100 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#0d1117', border: '1px solid var(--border-mid)', borderRadius: 12, width: 580, maxHeight: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border-dim)' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Cerca nei messaggi..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem',
              color: 'var(--text-primary)', letterSpacing: '0.02em'
            }}
          />
          {loading && <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>...</span>}
          <kbd style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--text-muted)', border: '1px solid var(--border-dim)', borderRadius: 4, padding: '2px 5px' }}>esc</kbd>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {results.length === 0 && query.trim() && !loading && (
            <div style={{ padding: '20px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              // nessun risultato
            </div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => onSelect(r.session_id)}
              style={{
                padding: '10px 16px',
                background: i === selected ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderBottom: '1px solid var(--border-dim)',
                cursor: 'pointer',
                transition: 'background 0.1s'
              }}
              onMouseEnter={() => setSelected(i)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-bright)' }}>{r.project}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--text-muted)' }}>{fmt(r.updated_at)}</span>
              </div>
              <div
                style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}
                dangerouslySetInnerHTML={{ __html: buildSnippetHtml(r.snippet || '') }}
              />
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-dim)', display: 'flex', gap: 12 }}>
          {[['↑↓', 'naviga'], ['↵', 'apri'], ['esc', 'chiudi']].map(([k, v]) => (
            <span key={k} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
              <kbd style={{ border: '1px solid var(--border-dim)', borderRadius: 3, padding: '1px 4px', marginRight: 4 }}>{k}</kbd>{v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
