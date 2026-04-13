export default function SearchBar({ onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120 }}
      onClick={onClose}>
      <div style={{ background: '#0d1117', border: '1px solid var(--border-mid)', borderRadius: 12, padding: 20, width: 560, color: 'var(--text-primary)' }}
        onClick={e => e.stopPropagation()}>
        Search — coming soon
      </div>
    </div>
  );
}
