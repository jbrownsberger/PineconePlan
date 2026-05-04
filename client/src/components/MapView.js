import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const COMMIT_COLORS = { Fixed: '#e94560', Likely: '#f4a261', Flexible: '#2ec4b6' };

export default function MapView({ entries }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const active = entries.filter(e =>
    e.lat && e.lng && date >= e.start_date && date <= e.end_date
  );

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ fontWeight: 600 }}>Show map for date:</label>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #ddd' }} />
        <span style={{ color: '#888', fontSize: '0.85rem' }}>
          {active.length} {active.length === 1 ? 'person' : 'people'} located on this date
        </span>
      </div>
      <MapContainer center={[39.5, -98.35]} zoom={4}
        style={{ height: '60vh', borderRadius: 12, border: '1px solid #eee' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap' />
        {active.map(e => (
          <Marker key={e.id} position={[e.lat, e.lng]}>
            <Popup>
              <strong>{e.person}</strong><br />
              {e.location}<br />
              <span style={{ color: COMMIT_COLORS[e.commitment] }}>{e.commitment}</span><br />
              {e.start_date} &rarr; {e.end_date}
              {e.notes && <><br /><em>{e.notes}</em></>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {active.length === 0 && (
        <p style={{ textAlign: 'center', color: '#aaa', marginTop: 16 }}>
          No entries with coordinates on this date. Use the 📍 button when adding entries to auto-detect coordinates.
        </p>
      )}
    </div>
  );
}
