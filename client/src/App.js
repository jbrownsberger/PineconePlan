
import React, { useState, useEffect, useCallback } from 'react';
import Timeline from './components/Timeline';
import EntryForm from './components/EntryForm';
import OverlapPanel from './components/OverlapPanel';
import GatheringsPanel from './components/GatheringsPanel';
import MapView from './components/MapView';
import './App.css';

const API = process.env.REACT_APP_API_URL || '';

export default function App() {
  const [entries, setEntries]       = useState([]);
  const [overlaps, setOverlaps]     = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const [gaps, setGaps]             = useState([]);
  const [tab, setTab]               = useState('timeline');
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [previewDate, setPreviewDate] = useState(null);

  const YEAR = new Date().getFullYear();

  const fetchAll = useCallback(async () => {
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
  }, [YEAR]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Add Plans
        </button>
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
