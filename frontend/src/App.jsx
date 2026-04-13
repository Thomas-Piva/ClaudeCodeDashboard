import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Session from './pages/Session';
import SearchBar from './components/SearchBar';

function AppShell() {
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  // Global Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(v => !v);
      }
      if (e.key === 'Escape') setShowSearch(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearchResult = useCallback((sessionId) => {
    setShowSearch(false);
    navigate(`/session/${sessionId}`);
  }, [navigate]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-void)' }}>
      {showSearch && (
        <SearchBar
          onClose={() => setShowSearch(false)}
          onSelect={handleSearchResult}
        />
      )}

      {/* Floating nav pills */}
      <div style={{
        position: 'fixed', bottom: 20, right: 24, zIndex: 100,
        display: 'flex', gap: 8
      }}>
        <NavLink to="/" end style={navStyle}>DASHBOARD</NavLink>
        <NavLink to="/analytics" style={navStyle}>ANALYTICS</NavLink>
        <button
          onClick={() => setShowSearch(true)}
          style={{ ...navStyle, cursor: 'pointer', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.04)' }}
          title="Cmd+K"
        >
          CERCA
        </button>
      </div>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/session/:id" element={<Session />} />
      </Routes>
    </div>
  );
}

const navStyle = {
  display: 'inline-flex', alignItems: 'center',
  padding: '6px 12px',
  background: 'rgba(10,12,20,0.92)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem',
  fontWeight: 600, letterSpacing: '0.1em',
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  transition: 'color 0.15s, border-color 0.15s',
};

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
