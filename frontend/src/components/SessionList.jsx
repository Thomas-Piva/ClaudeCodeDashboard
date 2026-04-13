import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config.js';

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function SessionList({ projectName }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/api/sessions?project=${encodeURIComponent(projectName)}&limit=5`)
      .then(r => r.json())
      .then(data => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectName]);

  if (loading) return (
    <div style={{ padding: '8px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
      caricamento...
    </div>
  );

  if (!sessions.length) return (
    <div style={{ padding: '8px 0', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
      // nessuna sessione indicizzata
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
      {sessions.map(s => (
        <div
          key={s.id}
          onClick={() => navigate(`/session/${s.id}`)}
          style={{
            padding: '6px 10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-dim)',
            borderRadius: 5,
            cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            transition: 'background 0.12s, border-color 0.12s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'var(--border-mid)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'var(--border-dim)'; }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
            {s.message_count} msg
          </span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
            {fmt(s.updated_at)}
          </span>
        </div>
      ))}
    </div>
  );
}
