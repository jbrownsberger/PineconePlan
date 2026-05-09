import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { eachDayOfInterval, format, isWeekend, parseISO, addDays, subDays } from 'date-fns';
import './Timeline.css';

// ── Location colour palette (forest / earthy) ──────────────────────────────
const PALETTE = [
  '#4a7c59','#c06e3a','#5b7fa6','#9b4f7a','#7a7a2e','#3a7a7a',
  '#a65c3a','#4f6ea6','#7a4f9b','#3a6e4f','#a6883a','#5a3a6e',
];
const locColorCache = {};
let paletteIdx = 0;
export function locationColor(loc) {
  const key = (loc || '').trim().toLowerCase();
  if (!locColorCache[key]) {
    locColorCache[key] = PALETTE[paletteIdx % PALETTE.length];
    paletteIdx++;
  }
  return locColorCache[key];
}

// ── Commitment rendering helpers ────────────────────────────────────────────
const COMMIT_OPACITY  = { Fixed: 1, Likely: 0.55, Flexible: 0.28, Travel: 0.7, Event: 1 };
const COMMIT_ICON     = { Travel: '✈', Event: '🎉' };
const COMMIT_HATCHED  = { Flexible: true };

// ── Month header helper ─────────────────────────────────────────────────────
function buildMonthSpans(days) {
  const spans = [];
  let cur = null;
  days.forEach((d, i) => {
    const m = format(d, 'MMM yyyy');
    if (!cur || cur.label !== m) {
      cur = { label: m, start: i, count: 1 };
      spans.push(cur);
    } else {
      cur.count++;
    }
  });
  return spans;
}

export default function Timeline({ entries, people, onEdit, onDelete }) {
  // ── Date range state ──────────────────────────────────────────────────────
  const thisYear = new Date().getFullYear();
  const [rangeStart, setRangeStart] = useState(`${thisYear}-06-01`);
  const [rangeEnd,   setRangeEnd]   = useState(`${thisYear}-08-31`);

  const days = useMemo(() => {
    try {
      const s = parseISO(rangeStart);
      const e = parseISO(rangeEnd);
      if (e >= s) return eachDayOfInterval({ start: s, end: e });
    } catch {}
    return [];
  }, [rangeStart, rangeEnd]);

  const monthSpans = useMemo(() => buildMonthSpans(days), [days]);

  // ── Location legend (sorted by first appearance) ──────────────────────────
  const locations = useMemo(() => {
    const seen = [];
    entries.forEach(e => {
      const k = (e.location || '').trim();
      if (k && !seen.includes(k)) seen.push(k);
    });
    return seen;
  }, [entries]);

  // ── Paint-to-select state ─────────────────────────────────────────────────
  const [paintPerson, setPaintPerson]     = useState(null);
  const [paintStart,  setPaintStart]      = useState(null);  // date string
  const [paintEnd,    setPaintEnd]        = useState(null);  // date string
  const [paintActive, setPaintActive]     = useState(false);
  const tableRef = useRef(null);

  // Mouse-up anywhere ends paint
  useEffect(() => {
    function onUp() {
      if (paintActive && paintPerson && paintStart && paintEnd) {
        // normalise so start <= end
        const a = paintStart < paintEnd ? paintStart : paintEnd;
        const b = paintStart < paintEnd ? paintEnd   : paintStart;
        onEdit({ __paintNew: true, person: paintPerson, start_date: a, end_date: b });
      }
      setPaintActive(false);
      setPaintPerson(null);
      setPaintStart(null);
      setPaintEnd(null);
    }
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [paintActive, paintPerson, paintStart, paintEnd, onEdit]);

  function handleCellDown(person, ds) {
    setPaintActive(true);
    setPaintPerson(person);
    setPaintStart(ds);
    setPaintEnd(ds);
  }
  function handleCellEnter(person, ds) {
    if (paintActive && person === paintPerson) setPaintEnd(ds);
  }

  function isPaintHighlighted(person, ds) {
    if (!paintActive || person !== paintPerson) return false;
    const a = paintStart < paintEnd ? paintStart : paintEnd;
    const b = paintStart < paintEnd ? paintEnd   : paintStart;
    return ds >= a && ds <= b;
  }

  return (
    <div className="timeline-wrap">

      {/* ── Controls bar ───────────────────────────────────────────────── */}
      <div className="timeline-controls">
        <div className="range-pickers">
          <label>
            From
            <input type="date" value={rangeStart}
              onChange={e => setRangeStart(e.target.value)} />
          </label>
          <span className="range-sep">→</span>
          <label>
            To
            <input type="date" value={rangeEnd}
              onChange={e => setRangeEnd(e.target.value)} />
          </label>
          <span className="day-count">{days.length} days</span>
        </div>
        <div className="commit-legend">
          <span className="cl-title">Commitment:</span>
          <span className="cl-item cl-fixed">■ Fixed</span>
          <span className="cl-item cl-likely">■ Likely</span>
          <span className="cl-item cl-flexible">▨ Flexible</span>
          <span className="cl-item">✈ Travel · 🎉 Event</span>
        </div>
      </div>

      {/* ── Location colour legend ──────────────────────────────────────── */}
      {locations.length > 0 && (
        <div className="loc-legend">
          {locations.map(loc => (
            <span key={loc} className="loc-legend-item">
              <span className="loc-dot" style={{ background: locationColor(loc) }} />
              {loc}
            </span>
          ))}
        </div>
      )}

      {/* ── Paint hint ─────────────────────────────────────────────────── */}
      <div className="paint-hint">💡 Drag across a row to paint a new entry</div>

      {/* ── Gantt grid ─────────────────────────────────────────────────── */}
      <div className="timeline-scroll" ref={tableRef}>
        <table className="timeline-table" onMouseLeave={() => { if (paintActive) { setPaintActive(false); setPaintPerson(null); setPaintStart(null); setPaintEnd(null); } }}>
          <thead>
            {/* Month row */}
            <tr className="month-row">
              <th className="name-col" />
              {monthSpans.map(ms => (
                <th key={ms.label} colSpan={ms.count} className="month-header">{ms.label}</th>
              ))}
            </tr>
            {/* Day-of-week row */}
            <tr className="dow-row">
              <th className="name-col" />
              {days.map(d => (
                <th key={d.toISOString()} className={`day-col${isWeekend(d) ? ' weekend' : ''}`}
                  title={format(d, 'EEE MMM d')}>
                  {format(d, 'd') === '1' ? format(d, 'MMM d') : format(d, 'd')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map(person => {
              const pEntries = entries.filter(e => e.person === person);
              return (
                <tr key={person} className="person-row">
                  <td className="name-col"><strong>{person}</strong></td>
                  {days.map(day => {
                    const ds = format(day, 'yyyy-MM-dd');
                    const match = pEntries.find(e => ds >= e.start_date && ds <= e.end_date);
                    const highlighted = isPaintHighlighted(person, ds);
                    const isFirst = match && (ds === match.start_date || (parseISO(rangeStart) > parseISO(match.start_date) && ds === format(parseISO(rangeStart), 'yyyy-MM-dd')));
                    const baseColor = match ? locationColor(match.location) : null;
                    const opacity   = match ? (COMMIT_OPACITY[match.commitment] ?? 0.8) : 1;
                    const hatched   = match ? !!COMMIT_HATCHED[match.commitment] : false;
                    const icon      = match ? COMMIT_ICON[match.commitment] : null;

                    return (
                      <td key={ds}
                        className={`day-cell${isWeekend(day) ? ' weekend' : ''}${highlighted ? ' paint-hi' : ''}`}
                        title={match ? `${match.location} · ${match.commitment}${match.notes ? ' — ' + match.notes : ''}` : 'Drag to add'}
                        onMouseDown={e => { e.preventDefault(); handleCellDown(person, ds); }}
                        onMouseEnter={() => handleCellEnter(person, ds)}
                        onTouchStart={e => { e.preventDefault(); handleCellDown(person, ds); }}
                        onTouchMove={e => {
                          const t = e.touches[0];
                          const el = document.elementFromPoint(t.clientX, t.clientY);
                          if (el && el.dataset.ds && el.dataset.person === person) handleCellEnter(person, el.dataset.ds);
                        }}
                        data-ds={ds}
                        data-person={person}
                        onClick={() => match && onEdit(match)}
                      >
                        {match && (
                          <div
                            className={`day-fill${hatched ? ' hatched' : ''}`}
                            style={{
                              background: hatched
                                ? `repeating-linear-gradient(45deg, ${baseColor} 0px, ${baseColor} 3px, transparent 3px, transparent 7px)`
                                : baseColor,
                              opacity,
                            }}
                          >
                            {icon && isFirst && <span className="commit-icon">{icon}</span>}
                          </div>
                        )}
                        {highlighted && !match && <div className="paint-preview" />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Entry chips (edit/delete sidebar) ──────────────────────────── */}
      <div className="entry-list">
        {people.map(person => {
          const pEntries = entries.filter(e => e.person === person);
          if (!pEntries.length) return null;
          return (
            <div key={person} className="entry-list-person">
              <strong>{person}</strong>
              {pEntries.map(e => (
                <div key={e.id} className="entry-chip"
                  style={{ borderLeft: `4px solid ${locationColor(e.location)}` }}>
                  <span className="chip-loc">{e.location}</span>
                  <span className="chip-dates">{e.start_date} → {e.end_date}</span>
                  <span className="chip-commit" style={{ opacity: COMMIT_OPACITY[e.commitment] ?? 0.8 }}>
                    {COMMIT_ICON[e.commitment] || ''} {e.commitment}
                  </span>
                  <button className="chip-btn" onClick={() => onEdit(e)} title="Edit">✏️</button>
                  <button className="chip-btn" onClick={() => onDelete(e.id)} title="Delete">🗑️</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>

    </div>
  );
}
