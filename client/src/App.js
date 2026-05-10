import React, { useState, useEffect, useCallback, useRef } from 'react';
import Timeline from './components/Timeline';
import EntryForm from './components/EntryForm';
import OverlapPanel from './components/OverlapPanel';
import GatheringsPanel from './components/GatheringsPanel';
import MapView from './components/MapView';
import './App.css';

const API = process.env.REACT_APP_API_URL || 'https://pineconeplanbackend.onrender.com';

// Pinecone emoji logo ──────────────────────────────────────────────────────
function PineconeLogo() {
  return (
    <span
      role="img"
      aria-label="PineconePlan"
      style={{ fontSize: '2rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}
    >
      🌲
    </span>
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

  const statusRef    = useRef(backendStatus);
  const cancelledRef = useRef(false);
  useEffect(() => { statusRef.current = backendStatus; }, [backendStatus]);

  const YEAR = new Date().getFullYear();

  // ── Keep-alive ping (mount/unmount only) ──────────────────────────────
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
          if (!keepAliveInterval) {
            keepAliveInterval = setInterval(() => {
              if (!cancelledRef.current) fetch(`${API}/api/health`, { cache: 'no-store' }).catch(() => {});
            }, 4 * 60 * 1000);
          }
          return;
        }
      } catch (err) { } // eslint-disable-line no-empty
      if (!cancelledRef.current) retryTimer = setTimeout(ping, 3000);
    }

    ping();
    errorTimer = setTimeout(() => {
      if (!cancelledRef.current && statusRef.current !== 'live') setBackendStatus('error');
    }, 90000);

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
  }, []); // empty deps intentional: lifecycle managed via refs

  // ── Data fetch ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [e, o, g] = await Promise.all([
        fetch(`${API}/api/entries`).then(r => r.json()),
        fetch(`${API}/api/overlaps`).then(r => r.json()),
        fetch(`${API}/api/gatherings`).then(r => r.json()),
      ]);
      setEntries(e); setOverlaps(o); setGatherings(g);
    } catch (err) { } // eslint-disable-line no-empty
  }, []);

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

  // ── CRUD ───────────────────────────────────────────────────────────────
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
      const { id, ...rest } = entry; // eslint-disable-line no-unused-vars
      setEditing({ ...rest });
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
