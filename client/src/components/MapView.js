import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
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

function makeIcon(color, label) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 22 14 22S28 24.5 28 14C28 6.27 21.73 0 14 0z"
            fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="#fff" opacity="0.9"/>
      <text x="14" y="18" text-anchor="middle" font-size="9" font-family="sans-serif"
            font-weight="700" fill="${color}">${label}</text>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

const ICONS = {
  Fixed:    makeIcon(COMMIT_COLORS.Fixed, 'F'),
  Likely:   makeIcon(COMMIT_COLORS.Likely, 'L'),
  Flexible: makeIcon(COMMIT_COLORS.Flexible, '≈'),
};

const TYPE_ICON = { Travel: '✈️', Event: '🎉', Stay: '🏠' };

export default function MapView({ entries }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const active = useMemo(
    () => entries.filter((e) => e.lat && e.lng && date >= e.start_date && date <= e.end_date),
    [entries, date]
  );

  const withOffset = useMemo(() => {
    const counts = {};
    return active.map((e) => {
      const key = `${e.lat},${e.lng}`;
      counts[key] = (counts[key] || 0) + 1;
      const idx = counts[key] - 1;
      return {
        ...e,
        displayLat: parseFloat(e.lat) + idx * 0.012,
        displayLng: parseFloat(e.lng) + idx * 0.012,
      };
    });
  }, [active]);

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600 }}>Show map for date:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #ddd' }}
        />
        <span style={{ color: '#888', fontSize: '0.85rem' }}>
          {active.length} {active.length === 1 ? 'person' : 'people'} located on this date
        </span>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {Object.entries(COMMIT_COLORS).map(([k, v]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: v, display: 'inline-block' }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      <MapContainer
        center={[39.5, -98.35]}
        zoom={4}
        style={{ height: '60vh', borderRadius: 12, border: '1px solid #eee' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        {withOffset.map((e) => (
          <Marker
            key={`${e.id}-${e.displayLat}`}
            position={[e.displayLat, e.displayLng]}
            icon={ICONS[e.commitment] || ICONS.Likely}
          >
            <Tooltip direction="top" offset={[0, -36]} opacity={0.95}>
              <strong>{e.person}</strong> — {TYPE_ICON[e.type] || ''} {e.location}
            </Tooltip>
            <Popup>
              <strong style={{ fontSize: '1rem' }}>{e.person}</strong>
              <br />
              <span>
                {TYPE_ICON[e.type] || ''} <strong>{e.type}</strong> · {e.location}
              </span>
              <br />
              <span style={{ color: COMMIT_COLORS[e.commitment] || '#888', fontWeight: 700 }}>
                {e.commitment}
              </span>
              <br />
              <span style={{ fontSize: '0.85rem', color: '#555' }}>
                {e.start_date} → {e.end_date}
              </span>
              {e.notes && (
                <>
                  <br />
                  <em style={{ color: '#777' }}>{e.notes}</em>
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {active.length === 0 && (
        <p style={{ textAlign: 'center', color: '#aaa', marginTop: 16 }}>
          No entries with coordinates on this date. Use the autocomplete when adding entries to auto-set coordinates.
        </p>
      )}
    </div>
  );
}
