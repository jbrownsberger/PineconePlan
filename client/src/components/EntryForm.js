
import React, { useState, useEffect } from 'react';
import './EntryForm.css';

const COMMITMENT_COLORS = { Fixed: '#e94560', Likely: '#f4a261', Flexible: '#2ec4b6' };

export default function EntryForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    person: '', location: '', lat: '', lng: '',
    start_date: today, end_date: today,
    commitment: 'Likely', notes: '',
    ...initial,
  });

  useEffect(() => {
    if (initial) setForm({ lat: '', lng: '', ...initial });
  }, [initial]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function geocode() {
    if (!form.location) return;
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.location)}&format=json&limit=1`
      );
      const d = await r.json();
      if (d[0]) { set('lat', parseFloat(d[0].lat).toFixed(4)); set('lng', parseFloat(d[0].lon).toFixed(4)); }
    } catch {}
  }

  function submit(e) {
    e.preventDefault();
    if (!form.person || !form.location || !form.start_date || !form.end_date) return;
    onSave({ ...form, lat: form.lat || null, lng: form.lng || null });
  }

  return (
    <form className="entry-form" onSubmit={submit}>
      <h2>{initial ? 'Edit Entry' : 'Add Plans'}</h2>

      <label>Your Name *
        <input value={form.person} onChange={e => set('person', e.target.value)} placeholder="e.g. Mom" required />
      </label>

      <label>Location *
        <div className="loc-row">
          <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="City, State" required />
          <button type="button" className="btn-geo" onClick={geocode} title="Auto-detect coordinates">📍</button>
        </div>
      </label>

      <div className="row2">
        <label>Lat
          <input type="number" step="any" value={form.lat} onChange={e => set('lat', e.target.value)} placeholder="auto" />
        </label>
        <label>Lng
          <input type="number" step="any" value={form.lng} onChange={e => set('lng', e.target.value)} placeholder="auto" />
        </label>
      </div>

      <div className="row2">
        <label>Start Date *
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} required />
        </label>
        <label>End Date *
          <input type="date" value={form.end_date} min={form.start_date} onChange={e => set('end_date', e.target.value)} required />
        </label>
      </div>

      <label>Commitment Level
        <div className="commitment-row">
          {['Fixed','Likely','Flexible'].map(c => (
            <button key={c} type="button"
              className={`commit-btn ${form.commitment === c ? 'active' : ''}`}
              style={form.commitment === c ? { background: COMMITMENT_COLORS[c], color: 'white', borderColor: COMMITMENT_COLORS[c] } : {}}
              onClick={() => set('commitment', c)}>
              {c === 'Fixed' ? '🔒 Fixed' : c === 'Likely' ? '📅 Likely' : '🔄 Flexible'}
            </button>
          ))}
        </div>
        <div className="commit-hint">
          {form.commitment === 'Fixed' && '🔒 Booked — flights, reservations, hard commitments'}
          {form.commitment === 'Likely' && '📅 Strong plan, but could shift if needed'}
          {form.commitment === 'Flexible' && '🔄 Tentative — happy to change for family coordination'}
        </div>
      </label>

      <label>Notes
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="e.g. Staying at Grandma's, work conference..." rows={2} />
      </label>

      <div className="form-actions">
        <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">
          {initial ? 'Save Changes' : 'Add Entry'}
        </button>
      </div>
    </form>
  );
}
