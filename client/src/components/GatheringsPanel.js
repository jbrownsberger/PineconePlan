import React, { useState } from 'react';

const RESPONSE_COLORS = { In: '#2ec4b6', Out: '#e94560', Maybe: '#f4a261' };

export default function GatheringsPanel({ gatherings, people, apiBase, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', location: '', start_date: '', end_date: '', proposed_by: '' });
  const [respondingTo, setRespondingTo] = useState(null);
  const [responder, setResponder] = useState('');

  async function propose(e) {
    e.preventDefault();
    await fetch(`${apiBase}/api/gatherings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    setShowForm(false); setForm({ title: '', location: '', start_date: '', end_date: '', proposed_by: '' });
    onRefresh();
  }

  async function respond(gid, person, response) {
    await fetch(`${apiBase}/api/gatherings/${gid}/respond`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ person, response }),
    });
    setRespondingTo(null); setResponder(''); onRefresh();
  }

  async function deleteGathering(id) {
    if (!window.confirm('Delete this gathering proposal?')) return;
    await fetch(`${apiBase}/api/gatherings/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>🏡 Proposed Gatherings</h2>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>+ Propose Gathering</button>
      </div>

      {showForm && (
        <form onSubmit={propose} style={{ background: 'white', border: '1px solid #eee', borderRadius: 10, padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3>New Gathering Proposal</h3>
          {[['title','Title','e.g. Fourth of July Reunion'],['location','Location','City, State'],['proposed_by','Proposed By','Your name']].map(([k,l,p]) => (
            <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.88rem', fontWeight: 600 }}>
              {l} <input value={form[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))} placeholder={p} required
                style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 8 }} />
            </label>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['start_date','Start'],['end_date','End']].map(([k,l]) => (
              <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.88rem', fontWeight: 600 }}>
                {l} <input type="date" value={form[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))} required
                  style={{ padding: '8px 12px', border: '1.5px solid #ddd', borderRadius: 8 }} />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 16px', border: '1.5px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn-primary">Propose</button>
          </div>
        </form>
      )}

      {gatherings.length === 0 && !showForm && (
        <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>No gatherings proposed yet. Be the first!</p>
      )}

      {gatherings.map(g => (
        <div key={g.id} style={{ background: 'white', border: '1px solid #eee', borderRadius: 10, padding: '18px 20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontSize: '1.05rem' }}>{g.title}</strong>
              <div style={{ color: '#666', fontSize: '0.88rem', marginTop: 4 }}>
                📍 {g.location} &middot; {g.start_date} &rarr; {g.end_date}
              </div>
              <div style={{ color: '#aaa', fontSize: '0.8rem', marginTop: 2 }}>Proposed by {g.proposed_by}</div>
            </div>
            <button onClick={() => deleteGathering(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '1.1rem' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {g.responses.map(r => (
              <span key={r.person} style={{
                background: RESPONSE_COLORS[r.response] + '22',
                color: RESPONSE_COLORS[r.response],
                border: `1px solid ${RESPONSE_COLORS[r.response]}`,
                borderRadius: 20, padding: '3px 12px', fontSize: '0.82rem', fontWeight: 600
              }}>
                {r.person}: {r.response}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
            {respondingTo === g.id ? (
              <>
                <select value={responder} onChange={e => setResponder(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #ddd' }}>
                  <option value="">Your name...</option>
                  {people.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {['In','Maybe','Out'].map(resp => (
                  <button key={resp} onClick={() => responder && respond(g.id, responder, resp)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: `1.5px solid ${RESPONSE_COLORS[resp]}`,
                      background: RESPONSE_COLORS[resp] + '22', color: RESPONSE_COLORS[resp],
                      cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                    {resp}
                  </button>
                ))}
                <button onClick={() => setRespondingTo(null)}
                  style={{ padding: '6px 12px', border: '1.5px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer' }}>
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setRespondingTo(g.id)}
                style={{ padding: '6px 14px', border: '1.5px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                Respond &rarr;
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
