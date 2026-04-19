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
          <div style={S.h1}>Guida installazione</div>
          <div style={S.subtitle}>
            Dashboard Claude Code + Wiki EGM condivisa —
            segui i passi nell'ordine, ci vogliono circa 10 minuti.
          </div>
        </div>

        <Section num="1" title="Prerequisiti" defaultOpen={true}>
          <p style={S.p}>Verifica di avere Node.js 18 o superiore:</p>
          <Pre>node -v</Pre>
          <p style={S.p}>Se il comando non funziona o la versione è inferiore a 18, scarica Node.js da <strong>nodejs.org</strong>.</p>
        </Section>

        <Section num="2" title="Installazione dashboard">
          <Pre>{`git clone https://github.com/Attilio81/ClaudeCodeDashboard.git
cd ClaudeCodeDashboard

npm install
cd backend && npm install
cd ../frontend && npm install && cd ..`}</Pre>
          <p style={S.p}>Avvia con:</p>
          <Pre>npm run dev</Pre>
          <p style={S.p}>Apri <strong>http://localhost:5173</strong> — vedrai subito le tue sessioni Claude Code attive.</p>
        </Section>

        <Section num="3" title="Configura le cartelle di lavoro">
          <p style={S.p}>
            Apri <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-primary)' }}>backend/scan-paths.json</code> e
            inserisci le cartelle radice dei tuoi progetti:
          </p>
          <Pre>{`["C:\\\\BIZ2017", "C:\\\\ProgettiEgm", "C:\\\\BUSEXP"]`}</Pre>
          <div style={S.note}>
            Inserisci solo le cartelle radice — la dashboard scansiona automaticamente le sottocartelle.
          </div>
          <p style={S.p}>Oppure aggiungile direttamente dalla dashboard: pulsante <strong>⚙ ADMIN</strong> in alto a destra.</p>
        </Section>

        <Section num="4" title="Notifiche Telegram (opzionale)">
          <p style={S.p}>Chiedi ad Attilio le credenziali Telegram, poi crea il file:</p>
          <Pre>{`cp backend/.env.example backend/.env`}</Pre>
          <p style={S.p}>Apri <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>backend/.env</code> e compila:</p>
          <Pre>{`TELEGRAM_TOKEN=<token>
TELEGRAM_CHAT_ID=<chat-id>
DEEPSEEK_API_KEY=<chiave>`}</Pre>
        </Section>

        <Section num="5" title="Hook Claude Code — stato in tempo reale">
          <p style={S.p}>Gli hook aggiornano la dashboard mentre lavori e inviano le notifiche Telegram.</p>
          <span style={S.label}>Crea lo script hook:</span>
          <Pre>{`mkdir -p ~/.claude/hooks

cat > ~/.claude/hooks/hook-event.sh << 'EOF'
#!/bin/bash
INPUT=$(cat)
curl -s -X POST "http://localhost:3001/api/hook-event" \\
  -H "Content-Type: application/json" \\
  -d "$INPUT" > /dev/null 2>&1 || true
EOF

chmod +x ~/.claude/hooks/hook-event.sh`}</Pre>
          <span style={S.label}>Aggiungi in ~/.claude/settings.json (sezione hooks, sostituisci &lt;tuousername&gt;):</span>
          <Pre>{`"Stop":        [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<tuousername>/.claude/hooks/hook-event.sh" }] }],
"PreToolUse":  [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<tuousername>/.claude/hooks/hook-event.sh" }] }],
"PostToolUse": [{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<tuousername>/.claude/hooks/hook-event.sh" }] }],
"Notification":[{ "matcher": "", "hooks": [{ "type": "command", "command": "bash /c/Users/<tuousername>/.claude/hooks/hook-event.sh" }] }]`}</Pre>
          <div style={S.note}>
            Il nome utente Windows è del tipo <strong>mario.rossi.EGMSISTEMI</strong> — puoi verificarlo con <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>whoami</code> nel terminale.
          </div>
        </Section>

        <Section num="6" title="Installa il comando /aggiornawiki">
          <p style={S.p}>
            Questo comando ti permette di scrivere nella wiki condivisa direttamente da qualsiasi sessione Claude Code,
            senza uscire da quello che stai facendo.
          </p>
          <Pre>{`mkdir -p ~/.claude/commands

# Scarica il comando dal repo
curl -s https://raw.githubusercontent.com/Attilio81/ClaudeCodeDashboard/main/GUIDA-COLLEGHI.md > /dev/null

# Oppure copia manualmente il file:
# C:\\Progetti Pilota\\DashboardClaudeCode\\GUIDA-COLLEGHI.md
# contiene il testo da incollare in ~/.claude/commands/aggiornawiki.md`}</Pre>
          <div style={S.tip}>
            Non serve riavviare Claude Code — il comando è disponibile immediatamente dopo aver creato il file.
          </div>
          <p style={S.p}>Come si usa:</p>
          <div style={S.example}>{`/aggiornawiki la logica di calcolo dello sconto in BNEG0112:
se il cliente ha pagato entro 30gg applica 2%, la funzione
è nella Sub CalcolaSconto() riga 145`}</div>
          <p style={S.p}>
            Claude scrive automaticamente nella wiki condivisa con la data e il tuo nome utente.
            Il file viene creato se non esiste.
          </p>
        </Section>

        <Section num="7" title="Apri la wiki in Obsidian">
          <p style={S.p}>La wiki condivisa è già popolata con la documentazione esistente.</p>
          <Pre>{`\\\\egmsql\\EGMStruttura\\Wiki-Egm`}</Pre>
          <p style={S.p}>
            In Obsidian: <strong>Apri cartella come vault</strong> → seleziona il percorso sopra.
          </p>
          <div style={S.tip}>
            La cartella è su rete — ogni collega che usa /aggiornawiki scrive nello stesso vault.
            La documentazione cresce dal lavoro di tutti.
          </div>
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
          {' '}Contatta <strong>Attilio Pregnolato</strong> oppure scrivi nel canale Teams.
        </div>

      </div>
    </div>
  );
}
