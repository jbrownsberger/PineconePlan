import React, { useState, useEffect, useCallback, useRef } from 'react';
import Timeline from './components/Timeline';
import EntryForm from './components/EntryForm';
import OverlapPanel from './components/OverlapPanel';
import GatheringsPanel from './components/GatheringsPanel';
import MapView from './components/MapView';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'https://pineconeplanbackend.onrender.com';

function PineconeLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="PineconePlan" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="20" rx="7" ry="9" fill="#5ea070" opacity="0.9"/>
      <ellipse cx="16" cy="17" rx="6" ry="7" fill="#3a7a50"/>
      <ellipse cx="16" cy="14" rx="5" ry="5.5" fill="#2a5c3a"/>
      <ellipse cx="16" cy="11" rx="4" ry="4" fill="#1b3a24"/>
      <rect x="15" y="3" width="2" height="5" rx="1" fill="#9e7a60"/>
      <ellipse cx="16" cy="3.5" rx="2.5" ry="1.5" fill="#c77b2a"/>
      <line x1="10" y1="18" x2="13" y2="16" stroke="#ddeee4" strokeWidth="0.8" opacity="0.7"/>
      <line x1="22" y1="18" x2="19" y2="16" stroke="#ddeee4" strokeWidth="0.8" opacity="0.7"/>
      <line x1="11" y1="22" x2="14" y2="20" stroke="#ddeee4" strokeWidth="0.8" opacity="0.7"/>
      <line x1="21" y1="22" x2="18" y2="20" stroke="#ddeee4" strokeWidth="0.8" opacity="0.7"/>
    </svg>
  );
}

function BackendStatus({ status }) {
  if (status === 'live') return (
    <span className="backend-status live" title="Backend is live">
      <span className="status-dot" /> Live
    </span>
  );
  if (status === 'error') return (
    <span className="backend-status error" title="Could not reach backend">
      <span className="status-dot" /> Offline
    </span>
  );
  return (
    <span className="backend-status waking" title="Waking up backend — may take 30 seconds">
      <span className="status-spinner" /> Waking up…
    </span>
  );
}

const TABS = [
  { id: 'timeline',   icon: '📅', label: 'Timeline'   },
  { id: 'map',        icon: '🗺️',  label: 'Map'        },
  { id: 'overlaps',   icon: '🤝', label: 'Overlaps'   },
  { id: 'gatherings', icon: '🏡', label: 'Gatherings' },
];

export default function App() {
  const [entries,    setEntries]    = useState([]);
  const [overlaps,   setOverlaps]   = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const [tab,        setTab]        = useState('timeline');
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [backendStatus, setBackendStatus] = useState('waking');

  // Stable refs so interval callbacks never hold stale closures
  const statusRef    = useRef(backendStatus);
  const cancelledRef = useRef(false);
  useEffect(() => { statusRef.current = backendStatus; }, [backendStatus]);

  const YEAR = new Date().getFullYear();

  // ── Keep-alive: runs forever; survives tab-switching ───────────────────
  useEffect(() => {
    cancelledRef.current = false;
    let retryTimer = null;
    let keepAliveInterval = null;
    let errorTimer = null;

    async function ping() {
      if (cancelledRef.current) return;
      try {
        const res = await fetch(`${API}/api/health`, { cache: 'no-store' });
        if (res.ok && !cancelledRef.current) {
          setBackendStatus('live');
          // Start keep-alive pings every 4 min if not already running
          if (!keepAliveInterval) {
            keepAliveInterval = setInterval(() => {
              if (!cancelledRef.current) {
                fetch(`${API}/api/health`, { cache: 'no-store' }).catch(() => {});
              }
            }, 4 * 60 * 1000);
          }
          return;
        }
      } catch {}
      if (!cancelledRef.current) retryTimer = setTimeout(ping, 3000);
    }

    ping();
    errorTimer = setTimeout(() => {
      if (!cancelledRef.current && statusRef.current !== 'live') setBackendStatus('error');
    }, 90000);

    // Re-ping when tab becomes visible (re-check, never tear down interval)
    function onVisibility() {
      if (document.visibilityState === 'visible' && !cancelledRef.current) {
        fetch(`${API}/api/health`, { cache: 'no-store' })
          .then(r => { if (r.ok && !cancelledRef.current) setBackendStatus('live'); })
          .catch(() => {});
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelledRef.current = true;
      clearTimeout(retryTimer);
      clearTimeout(errorTimer);
      clearInterval(keepAliveInterval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← empty deps: mount/unmount only — never re-runs on tab change

  // ── Data fetch ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [e, o, g] = await Promise.all([
        fetch(`${API}/api/entries`).then(r => r.json()),
        fetch(`${API}/api/overlaps`).then(r => r.json()),
        fetch(`${API}/api/gatherings`).then(r => r.json()),
      ]);
      setEntries(e); setOverlaps(o); setGatherings(g);
    } catch {}
  }, []);

  // Fetch once backend is live; re-fetch when tab becomes visible
  useEffect(() => {
    if (backendStatus === 'live') fetchAll();
  }, [backendStatus, fetchAll]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible' && statusRef.current === 'live') fetchAll();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [fetchAll]);

  // ── Entry CRUD ─────────────────────────────────────────────────────────
  async function saveEntry(data) {
    const { __paintNew, ...clean } = data;
    if (editing && editing.id && !__paintNew) {
      await fetch(`${API}/api/entries/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean),
      });
    } else {
      await fetch(`${API}/api/entries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clean),
      });
    }
    setShowForm(false); setEditing(null); fetchAll();
  }

  async function deleteEntry(id) {
    if (!window.confirm('Delete this entry?')) return;
    await fetch(`${API}/api/entries/${id}`, { method: 'DELETE' });
    fetchAll();
  }

  function openEdit(entry) {
    if (entry && entry.__paintNew) {
      const { __paintNew, id, ...rest } = entry;
      setEditing({ ...rest, __paintNew: true });
    } else {
      setEditing(entry);
    }
    setShowForm(true);
  }

  const people = [...new Set(entries.map(e => e.person))].sort();

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <PineconeLogo />
          <div>
            <h1>PineconePlan</h1>
            <div className="logo-sub">Family Summer Planner {YEAR}</div>
          </div>
        </div>
        <div className="header-right">
          <BackendStatus status={backendStatus} />
          <button className="btn-primary"
            onClick={() => { setEditing(null); setShowForm(true); }}>
            + Add Plans
          </button>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>{t.label}
            {t.id === 'overlaps' && overlaps.length > 0 &&
              <span className="badge">{overlaps.length}</span>}
          </button>
        ))}
      </nav>

      <main className="main">
        {backendStatus === 'waking' && (
          <div className="wake-overlay">
            <span className="pine-icon">🌲</span>
            <div className="wake-spinner" />
            <p>Waking up the server — usually takes under 30 seconds on a first visit. The pines are patient.</p>
          </div>
        )}
        {backendStatus === 'error' && (
          <div className="wake-overlay error">
            <p>⚠️ Could not reach the server. Please refresh and try again.</p>
          </div>
        )}
        {backendStatus === 'live' && (
          <>
            {tab === 'timeline' && (
              <Timeline entries={entries} people={people}
                onEdit={openEdit} onDelete={deleteEntry} />
            )}
            {tab === 'map'        && <MapView entries={entries} />}
            {tab === 'overlaps'   && <OverlapPanel overlaps={overlaps} />}
            {tab === 'gatherings' && (
              <GatheringsPanel gatherings={gatherings} people={people}
                apiBase={API} onRefresh={fetchAll} />
            )}
          </>
        )}
      </main>

      {showForm && (
        <div className="modal-overlay"
          onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <EntryForm initial={editing} onSave={saveEntry}
              onCancel={() => { setShowForm(false); setEditing(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
