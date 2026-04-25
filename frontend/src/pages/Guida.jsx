import React, { useState } from 'react';

const S = {
  page: {
    minHeight: '100vh',
    background: 'var(--bg-void)',
    padding: '48px 24px 80px',
    fontFamily: 'Syne, sans-serif',
    color: 'var(--text-primary)',
  },
  wrap: { maxWidth: 760, margin: '0 auto' },
  h1: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '1.5rem', fontWeight: 800,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--text-bright)', marginBottom: 6,
  },
  subtitle: {
    fontSize: '0.85rem', color: 'var(--text-secondary)',
    marginBottom: 48, lineHeight: 1.6,
  },
  section: {
    marginBottom: 36,
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 12, overflow: 'hidden',
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '14px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'pointer', userSelect: 'none',
  },
  stepNum: {
    width: 26, height: 26, borderRadius: '50%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid var(--border-mid)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.7rem', fontWeight: 700,
    color: 'var(--text-secondary)', flexShrink: 0,
  },
  sectionTitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: '0.82rem', fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--text-bright)', flex: 1,
  },
  chevron: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.7rem', color: 'var(--text-muted)',
    transition: 'transform 0.15s',
  },
  body: { padding: '20px 24px' },
  p: {
    fontSize: '0.85rem', color: 'var(--text-secondary)',
    lineHeight: 1.7, marginBottom: 14,
  },
  pre: {
    background: 'var(--bg-void)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 8, padding: '14px 16px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.75rem', color: 'var(--text-primary)',
    overflowX: 'auto', marginBottom: 14, lineHeight: 1.6,
    whiteSpace: 'pre',
  },
  note: {
    background: 'rgba(255,200,60,0.06)',
    border: '1px solid rgba(255,200,60,0.2)',
    borderRadius: 8, padding: '10px 14px',
    fontSize: '0.8rem', color: 'var(--amber)',
    lineHeight: 1.6, marginBottom: 14,
  },
  tip: {
    background: 'rgba(80,200,120,0.06)',
    border: '1px solid rgba(80,200,120,0.2)',
    borderRadius: 8, padding: '10px 14px',
    fontSize: '0.8rem', color: 'var(--green)',
    lineHeight: 1.6, marginBottom: 14,
  },
  label: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.72rem', color: 'var(--text-muted)',
    marginBottom: 6, display: 'block',
  },
  example: {
    background: 'rgba(100,160,255,0.06)',
    border: '1px solid rgba(100,160,255,0.2)',
    borderRadius: 8, padding: '14px 16px',
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: '0.75rem', color: 'var(--text-primary)',
    lineHeight: 1.6, marginBottom: 14,
    whiteSpace: 'pre-wrap',
  },
};

function Section({ num, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={S.section}>
      <div style={S.sectionHeader} onClick={() => setOpen(v => !v)}>
        <div style={S.stepNum}>{num}</div>
        <span style={S.sectionTitle}>{title}</span>
        <span style={{ ...S.chevron, transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
      </div>
      {open && <div style={S.body}>{children}</div>}
    </div>
  );
}

function Pre({ children }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <pre style={{ ...S.pre, marginBottom: 0 }}>{children}</pre>
      <button onClick={copy} style={{
        position: 'absolute', top: 8, right: 8,
        background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-subtle)',
        borderRadius: 5, padding: '3px 8px',
        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem',
        color: copied ? 'var(--green)' : 'var(--text-muted)',
        cursor: 'pointer',
      }}>{copied ? 'copiato!' : 'copia'}</button>
    </div>
  );
}

export default function Guida() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>

        <div style={{ marginBottom: 40 }}>
          <div style={S.h1}>Guida installazione (WSL hybrid)</div>
          <div style={S.subtitle}>
            Backend Node + Frontend Vite girano su Windows host.
            Claude Code gira dentro WSL Ubuntu. Dashboard monitora le sessioni WSL via UNC <code>\\wsl.localhost\</code>.
          </div>
        </div>

        <Section num="1" title="Prerequisiti" defaultOpen={true}>
          <p style={S.p}>Su Windows: Node.js 18+ installato.</p>
          <Pre>node -v</Pre>
          <p style={S.p}>WSL2 con Ubuntu-24.04 (o altra distro — aggiorna <code>backend/config.json</code>).</p>
          <Pre>{`wsl --version
wsl --list --verbose`}</Pre>
          <p style={S.p}>Claude Code installato dentro WSL (non su Windows). Verifica:</p>
          <Pre>{`wsl -d Ubuntu-24.04 -- which claude`}</Pre>
        </Section>

        <Section num="2" title="WSL2 mirrored networking">
          <p style={S.p}>
            Mirrored networking permette al hook bash dentro WSL di pingare il backend Windows su <strong>localhost:3001</strong>.
            Crea/modifica <code>%USERPROFILE%\.wslconfig</code>:
          </p>
          <Pre>{`[wsl2]
networkingMode=mirrored
firewall=true`}</Pre>
          <p style={S.p}>Riavvia WSL per applicare:</p>
          <Pre>wsl --shutdown</Pre>
          <div style={S.note}>
            Mirrored networking richiede Windows 11 22H2+. Se rompe VPN o Docker → torna a NAT e usa il gateway IP nel hook.
          </div>
        </Section>

        <Section num="3" title="Firewall Windows: porta 3001 inbound">
          <p style={S.p}>PowerShell come <strong>Amministratore</strong>:</p>
          <Pre>{`New-NetFirewallRule -DisplayName "ClaudeCodeDashboard" \\
  -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow`}</Pre>
        </Section>

        <Section num="4" title="Clone + install dashboard (Windows)">
          <Pre>{`cd C:\\
git clone https://github.com/Thomas-Piva/ClaudeCodeDashboard.git
cd C:\\ClaudeCodeDashboard

npm install
cd backend && npm install
cd ..\\frontend && npm install && cd ..`}</Pre>
          <p style={S.p}>Avvio:</p>
          <Pre>npm run dev</Pre>
          <p style={S.p}>Apri <strong>http://localhost:5173</strong>.</p>
        </Section>

        <Section num="5" title="Configura cartelle scansionate">
          <p style={S.p}>
            <code>backend/scan-paths.json</code> contiene path <strong>Linux</strong> (visti dalla prospettiva di WSL):
          </p>
          <Pre>{`["/home/thomas"]`}</Pre>
          <p style={S.p}>
            Il backend converte internamente in UNC per leggere il filesystem WSL.
            Aggiungi/rimuovi anche dal pannello <strong>⚙ ADMIN</strong>.
          </p>
          <div style={S.note}>
            Esclusioni utili in <code>backend/excluded-paths.json</code>: <code>/home/thomas/.claude</code>, <code>/home/thomas/obsidian_second_brain</code>.
          </div>
        </Section>

        <Section num="6" title="Hook Claude Code (dentro WSL)">
          <p style={S.p}>I hook girano in WSL e POST a <strong>http://localhost:3001/api/hook-event</strong> (mirrored networking).</p>
          <span style={S.label}>Crea lo script hook in WSL:</span>
          <Pre>{`mkdir -p ~/.claude/hooks

cat > ~/.claude/hooks/hook-event.sh << 'EOF'
#!/bin/bash
INPUT=$(cat)
# Mirrored networking: localhost punta a Windows host
URL="http://localhost:3001/api/hook-event"
# Fallback: gateway IP se mirrored non disponibile
if ! curl -s --max-time 1 -o /dev/null -w "%{http_code}" "$URL" | grep -q "^[23]"; then
  GATEWAY=$(ip route show default | awk '/default/ {print $3; exit}')
  URL="http://$GATEWAY:3001/api/hook-event"
fi
curl -s -X POST "$URL" \\
  -H "Content-Type: application/json" \\
  -d "$INPUT" > /dev/null 2>&1 || true
EOF

chmod +x ~/.claude/hooks/hook-event.sh`}</Pre>
          <span style={S.label}>Aggiungi in ~/.claude/settings.json (sezione hooks):</span>
          <Pre>{`"hooks": {
  "Stop":         [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/hook-event.sh" }] }],
  "PreToolUse":   [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/hook-event.sh" }] }],
  "PostToolUse":  [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/hook-event.sh" }] }],
  "Notification": [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash ~/.claude/hooks/hook-event.sh" }] }]
}`}</Pre>
        </Section>

        <Section num="7" title="Configura wiki path (vault Obsidian)">
          <p style={S.p}>I 5 slash command (/analizzacodebase, /aggiornawiki, ecc.) leggono il path del vault da:</p>
          <Pre>{`cat > ~/.claude/wiki-config.json << 'EOF'
{
  "wikiPath": "/home/thomas/obsidian_second_brain/second_brain/ClaudeWiki"
}
EOF`}</Pre>
          <p style={S.p}>Struttura vault (schema Karpathy):</p>
          <Pre>{`ClaudeWiki/
├── index.md         (MOC globale)
├── log.md           (timeline append-only di tutti i comandi)
├── global/
│   └── io.md        (contesto personale)
└── progetti/
    └── <nome>/
        ├── Architettura/
        ├── Sessioni/
        ├── Manuali/
        ├── Rilasci/
        └── Graphify/   (opzionale, da tool esterno)`}</Pre>
        </Section>

        <Section num="8" title="Verifica end-to-end">
          <p style={S.p}>1. Health backend:</p>
          <Pre>curl http://localhost:3001/api/health</Pre>
          <p style={S.p}>2. Hook ping da WSL:</p>
          <Pre>{`echo '{"hook_event_name":"Stop","cwd":"/home/thomas/Costruzione_Memory"}' \\
  | bash ~/.claude/hooks/hook-event.sh`}</Pre>
          <p style={S.p}>3. Debug encoding (anche da AdminPanel):</p>
          <Pre>{`curl "http://localhost:3001/api/debug/path-encoding?linux=/home/thomas/Costruzione_Memory"`}</Pre>
          <div style={S.tip}>
            Atteso: <code>{`{ exists: true, computed: "-home-thomas-Costruzione-Memory", sessionFiles: N }`}</code>
          </div>
          <p style={S.p}>4. Avvia <code>claude</code> in WSL su un progetto, refresh dashboard → card appare con stato "Attivo".</p>
        </Section>

        <div style={{
          marginTop: 48, padding: '20px 24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          fontSize: '0.82rem', color: 'var(--text-secondary)',
          lineHeight: 1.7,
        }}>
          <span style={{ color: 'var(--text-bright)', fontWeight: 700 }}>Problemi?</span>
          {' '}Verifica WSL distro/user in <code>backend/config.json</code>, controlla firewall 3001,
          riavvia WSL con <code>wsl --shutdown</code>.
        </div>

      </div>
    </div>
  );
}
