import React, { useState, useEffect, useCallback } from 'react';
import Timeline from './components/Timeline';
import EntryForm from './components/EntryForm';
import OverlapPanel from './components/OverlapPanel';
import GatheringsPanel from './components/GatheringsPanel';
import MapView from './components/MapView';
import './App.css';

const API = process.env.REACT_APP_API_URL || '';

// Status indicator shown in the header
function BackendStatus({ status }) {
  if (status === 'live') {
    return (
      <span className="backend-status live" title="Backend is live">
        <span className="status-dot" />
        Live
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="backend-status error" title="Could not reach backend">
        <span className="status-dot" />
        Offline
      </span>
    );
  }
  // 'waking' state
  return (
    <span className="backend-status waking" title="Waking up backend — may take 30 seconds">
      <span className="status-spinner" />
      Waking up…
    </span>
  );
}

export default function App() {
  const [entries, setEntries]       = useState([]);
  const [overlaps, setOverlaps]     = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const [gaps, setGaps]             = useState([]);
  const [tab, setTab]               = useState('timeline');
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [previewDate, setPreviewDate] = useState(null);
  const [backendStatus, setBackendStatus] = useState('waking'); // 'waking' | 'live' | 'error'

  const YEAR = new Date().getFullYear();

  // Wake-up ping: fires immediately on load, retries every 3s until the backend responds
  useEffect(() => {
    let cancelled = false;
    let timer;

    async function ping() {
      try {
        const res = await fetch(`${API}/api/health`, { cache: 'no-store' });
        if (res.ok && !cancelled) {
          setBackendStatus('live');
          return; // stop retrying
        }
      } catch {}
      if (!cancelled) {
        timer = setTimeout(ping, 3000); // retry every 3s if not yet live
      }
    }

    ping();
    // Timeout to 'error' state after 90s if never responded
    const errorTimer = setTimeout(() => {
      if (!cancelled) setBackendStatus('error');
    }, 90000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(errorTimer);
    };
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [e, o, g, gp] = await Promise.all([
        fetch(`${API}/api/entries`).then(r => r.json()),
        fetch(`${API}/api/overlaps`).then(r => r.json()),
        fetch(`${API}/api/gatherings`).then(r => r.json()),
        fetch(`${API}/api/gaps?year=${YEAR}`).then(r => r.json()),
      ]);
      setEntries(e);
      setOverlaps(o);
      setGatherings(g);
      setGaps(gp);
    } catch {}
  }, [YEAR]);

  // Fetch data once backend is live
  useEffect(() => {
    if (backendStatus === 'live') fetchAll();
  }, [backendStatus, fetchAll]);

  async function saveEntry(data) {
    if (editing) {
      await fetch(`${API}/api/entries/${editing.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
    } else {
      await fetch(`${API}/api/entries`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
    }
    setShowForm(false); setEditing(null); fetchAll();
  }

  async function deleteEntry(id) {
    if (!window.confirm('Delete this entry?')) return;
    await fetch(`${API}/api/entries/${id}`, { method: 'DELETE' });
    fetchAll();
  }

  function openEdit(entry) { setEditing(entry); setShowForm(true); }

  const people = [...new Set(entries.map(e => e.person))].sort();

  return (
    <div className="app">
      <header className="header">
        <h1>🗺️ Family Summer Planner {YEAR}</h1>
        <div className="header-right">
          <BackendStatus status={backendStatus} />
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            + Add Plans
          </button>
        </div>
      </header>

      <nav className="tabs">
        {['timeline','map','overlaps','gatherings'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'overlaps' && overlaps.length > 0 && <span className="badge">{overlaps.length}</span>}
          </button>
        ))}
      </nav>

      {gaps.length > 0 && (
        <div className="gap-banner">
          ⚠️ Uncovered summer windows: {gaps.map(g => `${g.from} → ${g.to}`).join(', ')}
        </div>
      )}

      <main className="main">
        {backendStatus === 'waking' && (
          <div className="wake-overlay">
            <div className="wake-spinner" />
            <p>Waking up the server — usually takes under 30 seconds on first visit…</p>
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
              <Timeline entries={entries} people={people} year={YEAR}
                onEdit={openEdit} onDelete={deleteEntry} onDateClick={setPreviewDate} />
            )}
            {tab === 'map' && (
              <MapView entries={entries} previewDate={previewDate} />
            )}
            {tab === 'overlaps' && (
              <OverlapPanel overlaps={overlaps} />
            )}
            {tab === 'gatherings' && (
              <GatheringsPanel gatherings={gatherings} people={people}
                apiBase={API} onRefresh={fetchAll} />
            )}
          </>
        )}
      </main>

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditing(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <EntryForm initial={editing} onSave={saveEntry}
              onCancel={() => { setShowForm(false); setEditing(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
