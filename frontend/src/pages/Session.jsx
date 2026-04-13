import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../config.js';

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ToolChip({ name }) {
  return (
    <span style={{
      background: 'rgba(100,181,246,0.1)', color: 'var(--blue)',
      border: '1px solid rgba(100,181,246,0.25)',
      borderRadius: 4, padding: '1px 6px',
      fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem',
      marginLeft: 6
    }}>{name}</span>
  );
}

function Message({ msg, isSelected }) {
  const isUser = msg.role === 'user';
  const tools = (() => { try { return JSON.parse(msg.tools_used || '[]'); } catch { return []; } })();

  // Thinking messages: content text starts with thinking block indicator
  // We identify thinking messages by checking if tools_used is empty and role is assistant
  // and content contains only thinking text (heuristic: skip if showThinking is false and msg was from a thinking block)
  // Actually: thinking blocks are included in content during indexing. We can't distinguish them post-hoc.
  // Just render all messages normally.

  return (
    <div
      style={{
        padding: '12px 16px',
        background: isSelected
          ? 'rgba(251,191,36,0.06)'
          : isUser
            ? 'rgba(30,58,95,0.12)'
            : 'rgba(20,40,20,0.1)',
        border: `1px solid ${isSelected ? 'rgba(251,191,36,0.3)' : isUser ? 'rgba(30,58,95,0.4)' : 'rgba(20,40,20,0.4)'}`,
        borderRadius: 8, marginBottom: 8,
        transition: 'background 0.15s, border-color 0.15s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 4 }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem',
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: isUser ? 'var(--blue)' : 'var(--green)',
          fontWeight: 600
        }}>{msg.role}</span>
        {tools.map((t, i) => <ToolChip key={i} name={t} />)}
        <span style={{ marginLeft: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
          {fmt(msg.timestamp)}
        </span>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
        color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function Session() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reversed, setReversed] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    fetch(`${API_BASE}/api/sessions/${id}?limit=1000`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(data => {
        setSession(data);
        setMessages(data.messages || []);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  // Keyboard shortcuts: j/k, o
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'j') setSelectedIdx(v => Math.min(v + 1, messages.length - 1));
      if (e.key === 'k') setSelectedIdx(v => Math.max(v - 1, 0));
      if (e.key === 'o') setReversed(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [messages.length]);

  const handleExport = () => {
    window.open(`${API_BASE}/api/sessions/${id}/export`, '_blank');
  };

  const displayed = reversed ? [...messages].reverse() : messages;

  if (loading) return (
    <div style={{ padding: 48, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      caricamento...
    </div>
  );

  if (error) return (
    <div style={{ padding: 48, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--red)' }}>
      ✗ {error}
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 32px 72px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1, padding: '2px 4px', marginTop: 2 }}
          title="Torna al dashboard"
        >←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-bright)', margin: '0 0 4px' }}>
            {session?.project}
          </h1>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
            <span>{session?.message_count} messaggi</span>
            <span>aggiornato {fmt(session?.updated_at)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setReversed(v => !v)}
            title="Toggle sort order (o)"
            style={toolbarBtn(reversed)}
          >
            {reversed ? '↑ recenti' : '↓ vecchi'}
          </button>
          <button onClick={handleExport} style={toolbarBtn(false)} title="Scarica HTML">
            ↓ export
          </button>
        </div>
      </div>

      {/* Keyboard hint */}
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)', marginBottom: 16, display: 'flex', gap: 14 }}>
        {[['j/k', 'naviga'], ['o', 'ordine']].map(([k, v]) => (
          <span key={k}><kbd style={{ border: '1px solid var(--border-dim)', borderRadius: 3, padding: '1px 4px', marginRight: 3 }}>{k}</kbd>{v}</span>
        ))}
      </div>

      {/* Messages */}
      {displayed.map((msg, i) => (
        <Message
          key={msg.id}
          msg={msg}
          index={i}
          isSelected={i === selectedIdx}
        />
      ))}
    </div>
  );
}

function toolbarBtn(active) {
  return {
    padding: '5px 10px',
    background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
    border: `1px solid ${active ? 'var(--border-mid)' : 'var(--border-subtle)'}`,
    borderRadius: 6, cursor: 'pointer',
    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    transition: 'all 0.15s'
  };
}
