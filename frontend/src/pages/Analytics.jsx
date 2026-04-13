import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config.js';

// GitHub-style heatmap: last 365 days as a grid of squares
function Heatmap({ data }) {
  const lookup = {};
  for (const d of data) lookup[d.date] = d.count;

  const days = [];
  const now = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: lookup[key] || 0 });
  }

  const max = Math.max(...days.map(d => d.count), 1);

  function cellColor(count) {
    if (!count) return 'rgba(255,255,255,0.04)';
    const ratio = count / max;
    if (ratio < 0.25) return 'rgba(0,230,118,0.2)';
    if (ratio < 0.5)  return 'rgba(0,230,118,0.4)';
    if (ratio < 0.75) return 'rgba(0,230,118,0.65)';
    return 'rgba(0,230,118,0.9)';
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {week.map(d => (
              <div
                key={d.key}
                title={`${d.key}: ${d.count} messaggi`}
                style={{
                  width: 11, height: 11, borderRadius: 2,
                  background: cellColor(d.count),
                  transition: 'background 0.1s'
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal bar chart (pure CSS)
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {data.map(d => (
        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--text-secondary)', width: 100, flexShrink: 0, textAlign: 'right' }}>
            {d.name}
          </span>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 3, height: 14, overflow: 'hidden' }}>
            <div style={{
              width: `${(d.count / max) * 100}%`, height: '100%',
              background: 'rgba(100,181,246,0.6)', borderRadius: 3,
              transition: 'width 0.4s ease'
            }} />
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>
            {d.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{
        fontFamily: 'Syne, sans-serif', fontSize: '0.72rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'var(--text-secondary)', marginBottom: 14,
        paddingBottom: 8, borderBottom: '1px solid var(--border-dim)'
      }}>{title}</div>
      {children}
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/analytics`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 48, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
      caricamento analytics...
    </div>
  );

  if (!data) return (
    <div style={{ padding: 48, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--red)' }}>
      ✗ errore caricamento dati
    </div>
  );

  const totalMessages = data.heatmap.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 32px 72px' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: 4 }}>
        ANALYTICS
      </h1>
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 28 }}>
        {totalMessages} messaggi negli ultimi 365 giorni
      </p>

      <Section title="Attività nel tempo">
        <Heatmap data={data.heatmap} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
          {['rgba(255,255,255,0.04)', 'rgba(0,230,118,0.2)', 'rgba(0,230,118,0.4)', 'rgba(0,230,118,0.65)', 'rgba(0,230,118,0.9)'].map((c, i) => (
            <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: c }} />
          ))}
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.58rem', color: 'var(--text-muted)', marginLeft: 4 }}>meno → più</span>
        </div>
      </Section>

      <Section title="Tool usage (top 10)">
        {data.toolUsage.length === 0
          ? <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-muted)' }}>// nessun dato</p>
          : <BarChart data={data.toolUsage} />
        }
      </Section>

      <Section title="Progetti">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Progetto', 'Sessioni', 'Messaggi', 'Ultima attività'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '6px 12px',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-muted)', borderBottom: '1px solid var(--border-dim)'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.projectBreakdown.map(p => (
              <tr key={p.project} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'Syne, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-bright)' }}>{p.project}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.sessions}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{p.messages || 0}</td>
                <td style={{ padding: '8px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{fmt(p.last_active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
