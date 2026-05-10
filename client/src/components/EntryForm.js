import React, { useState, useEffect, useRef, useCallback } from 'react';
import './EntryForm.css';

// Entry types ─────────────────────────────────────────────────────────────
const TYPES = [
  { id: 'Stay',   icon: '🏠', label: 'Stay',   hint: 'You\'ll be sleeping here' },
  { id: 'Travel', icon: '✈️',  label: 'Travel', hint: 'In transit — flight, drive, etc.' },
  { id: 'Event',  icon: '🎉', label: 'Event',  hint: 'One-time event or occasion' },
];

// Commitment levels ────────────────────────────────────────────────────────
const COMMITMENTS = [
  { id: 'Fixed',    icon: '🔒', hint: 'Booked — flights, reservations, hard commitments' },
  { id: 'Likely',   icon: '📅', hint: 'Strong plan, but could shift if needed' },
  { id: 'Flexible', icon: '🔄', hint: 'Tentative — happy to change for family coordination' },
];

// Nominatim autocomplete (free, no key) ───────────────────────────────────
function useLocationSuggest(query) {
  const [suggestions, setSuggestions] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) { setSuggestions([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        const seen = new Set();
        const deduped = [];
        for (const item of data) {
          // Build a short readable label
          const a = item.address || {};
          const parts = [
            a.city || a.town || a.village || a.municipality || a.county || item.name,
            a.state || a.region,
            a.country_code ? a.country_code.toUpperCase() : null,
          ].filter(Boolean);
          const label = parts.join(', ');
          if (!seen.has(label)) {
            seen.add(label);
            deduped.push({ label, lat: parseFloat(item.lat).toFixed(4), lng: parseFloat(item.lon).toFixed(4) });
          }
        }
        setSuggestions(deduped);
      } catch { setSuggestions([]); }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return suggestions;
}

// ─────────────────────────────────────────────────────────────────────────
export default function EntryForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    person: '', location: '', lat: '', lng: '',
    start_date: today, end_date: today,
    commitment: 'Likely', type: 'Stay', notes: '',
    ...initial,
  });
  const [showLatLng, setShowLatLng] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [locQuery, setLocQuery] = useState(form.location || '');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (initial) {
      setForm({ lat: '', lng: '', type: 'Stay', ...initial });
      setLocQuery(initial.location || '');
    }
  }, [initial]);

  const suggestions = useLocationSuggest(locQuery);

  // Close dropdown on outside click
  useEffect(() => {
    function onDown(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Show dropdown whenever suggestions arrive
  useEffect(() => {
    if (suggestions.length > 0) setDropdownOpen(true);
    else setDropdownOpen(false);
  }, [suggestions]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function pickSuggestion(s) {
    set('location', s.label);
    set('lat', s.lat);
    set('lng', s.lng);
    setLocQuery(s.label);
    setDropdownOpen(false);
  }

  function submit(e) {
    e.preventDefault();
    if (!form.person || !form.location || !form.start_date || !form.end_date) return;
    onSave({ ...form, lat: form.lat || null, lng: form.lng || null });
  }

  const typeStyle = (t) => {
    if (form.type !== t.id) return {};
    const colors = { Stay: '#3a7a50', Travel: '#5567b0', Event: '#9b59b6' };
    return { background: colors[t.id] + '18', borderColor: colors[t.id], color: colors[t.id] };
  };

  return (
    <form className="entry-form" onSubmit={submit}>
      <h2>{initial && initial.id ? 'Edit Entry' : 'Add Plans'}</h2>

      {/* ── Entry type ───────────────────────────────────── */}
      <label>Type
        <div className="entry-type-row">
          {TYPES.map(t => (
            <button key={t.id} type="button"
              className={`type-btn ${form.type === t.id ? 'active' : ''}`}
              style={typeStyle(t)}
              onClick={() => set('type', t.id)}
              title={t.hint}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="commit-hint">
          {TYPES.find(t => t.id === form.type)?.hint}
        </div>
      </label>

      {/* ── Person ───────────────────────────────────────── */}
      <label>Your Name *
        <input value={form.person}
          onChange={e => set('person', e.target.value)}
          placeholder="e.g. Mom" required />
      </label>

      {/* ── Location with autocomplete ───────────────────── */}
      <label>Location *
        <div className="loc-row" ref={dropdownRef}>
          <div className="loc-input-wrap">
            <input
              value={locQuery}
              onChange={e => { setLocQuery(e.target.value); set('location', e.target.value); }}
              onFocus={() => { if (suggestions.length) setDropdownOpen(true); }}
              placeholder="Start typing a city…"
              required
              autoComplete="off"
            />
            {dropdownOpen && suggestions.length > 0 && (
              <ul className="loc-dropdown">
                {suggestions.map((s, i) => (
                  <li key={i}
                    className="loc-option"
                    onMouseDown={e => { e.preventDefault(); pickSuggestion(s); }}>
                    📍 {s.label}
                    {(s.lat && s.lng) && (
                      <span className="loc-coords">{s.lat}, {s.lng}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </label>

      {/* ── Lat/lng (hidden by default) ───────────────────── */}
      <button type="button" className="latlong-toggle"
        onClick={() => setShowLatLng(s => !s)}>
        {showLatLng ? '▾ Hide' : '▸ Show'} coordinates
        {form.lat && form.lng ? ` (${form.lat}, ${form.lng})` : ' (not set)'}
      </button>
      <div className={`latlong-row${showLatLng ? ' visible' : ''}`}>
        <label>Lat
          <input type="number" step="any" value={form.lat}
            onChange={e => set('lat', e.target.value)} placeholder="auto" />
        </label>
        <label>Lng
          <input type="number" step="any" value={form.lng}
            onChange={e => set('lng', e.target.value)} placeholder="auto" />
        </label>
      </div>

      {/* ── Dates ────────────────────────────────────────── */}
      <div className="row2">
        <label>Start Date *
          <input type="date" value={form.start_date}
            onChange={e => set('start_date', e.target.value)} required />
        </label>
        <label>End Date *
          <input type="date" value={form.end_date} min={form.start_date}
            onChange={e => set('end_date', e.target.value)} required />
        </label>
      </div>

      {/* ── Commitment ───────────────────────────────────── */}
      <label>Commitment
        <div className="commitment-row">
          {COMMITMENTS.map(c => (
            <button key={c.id} type="button"
              className={`commit-btn ${form.commitment === c.id ? 'active' : ''}`}
              onClick={() => set('commitment', c.id)}>
              {c.icon} {c.id}
            </button>
          ))}
        </div>
        <div className="commit-hint">
          {COMMITMENTS.find(c => c.id === form.commitment)?.hint}
        </div>
      </label>

      {/* ── Notes ────────────────────────────────────────── */}
      <label>Notes
        <textarea value={form.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="e.g. Staying at Grandma's, work conference…" rows={2} />
      </label>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">
          {initial && initial.id ? 'Save Changes' : 'Add Entry'}
        </button>
      </div>
    </form>
  );
}
