import React from 'react';

const COMMIT_COLORS = { Fixed: '#e94560', Likely: '#f4a261', Flexible: '#2ec4b6' };

export default function OverlapPanel({ overlaps }) {
  if (overlaps.length === 0)
    return <p style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>No location overlaps found yet.</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>📍 Location Overlaps</h2>
      <p style={{ color: '#666', marginBottom: 20, fontSize: '0.9rem' }}>
        These are windows where family members will be in the same place.
      </p>
      {overlaps.map((o, i) => (
        <div key={i} style={{
          background: 'white', border: '1px solid #eee', borderRadius: 10,
          padding: '16px 20px', marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center'
        }}>
          <div style={{ fontSize: '2rem' }}>🎉</div>
          <div>
            <strong>{o.people.join(' & ')}</strong> will both be in <strong>{o.location}</strong>
            <div style={{ color: '#666', fontSize: '0.88rem', marginTop: 4 }}>
              {o.from} &rarr; {o.to}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
              {o.people.map((p, j) => (
                <span key={p} style={{
                  background: COMMIT_COLORS[o.commitments[j]] + '22',
                  color: COMMIT_COLORS[o.commitments[j]],
                  border: `1px solid ${COMMIT_COLORS[o.commitments[j]]}`,
                  borderRadius: 20, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600
                }}>
                  {p}: {o.commitments[j]}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
