import React, { useMemo, useState, useRef, useEffect } from 'react';
import { eachDayOfInterval, format, isWeekend, parseISO } from 'date-fns';
import './Timeline.css';

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

const COMMIT_OPACITY = { Fixed: 1, Likely: 0.72, Flexible: 1 };
const COMMIT_HATCHED = { Flexible: true };
const TYPE_COLOR = { Travel: '#7a8fd4', Event: '#b06fcf' };
const TYPE_ICON  = { Travel: '✈', Event: '🎉' };

function buildMonthSpans(days) {
  const spans = [];
  let cur = null;
  days.forEach((d, i) => {
    const m = format(d, 'MMM yyyy');
    if (!cur || cur.label !== m) { cur = { label: m, start: i, count: 1 }; spans.push(cur); }
    else cur.count++;
  });
  return spans;
}

export default function Timeline({ entries, people, onEdit, onDelete }) {
  const thisYear = new Date().getFullYear();
  const [rangeStart, setRangeStart] = useState(`${thisYear}-06-01`);
  const [rangeEnd,   setRangeEnd]   = useState(`${thisYear}-08-31`);

  const days = useMemo(() => {
    try {
      const s = parseISO(rangeStart), e = parseISO(rangeEnd);
      if (e >= s) return eachDayOfInterval({ start: s, end: e });
    } catch {}
    return [];
  }, [rangeStart, rangeEnd]);

  const monthSpans = useMemo(() => buildMonthSpans(days), [days]);

  const locations = useMemo(() => {
    const seen = [];
    entries.forEach(e => {
      const k = (e.location || '').trim();
      if (k && !seen.includes(k)) seen.push(k);
    });
    return seen;
  }, [entries]);

  const [paintPerson, setPaintPerson] = useState(null);
  const [paintStart,  setPaintStart]  = useState(null);
  const [paintEnd,    setPaintEnd]    = useState(null);
  const [paintActive, setPaintActive] = useState(false);
  const paintMovedRef = useRef(false);

  useEffect(() => {
    function onUp() {
      if (paintActive && paintPerson && paintStart) {
        const end = paintEnd || paintStart;
        const a = paintStart <= end ? paintStart : end;
        const b = paintStart <= end ? end : paintStart;
        if (paintMovedRef.current) {
          onEdit({ __paintNew: true, person: paintPerson, start_date: a, end_date: b });
        }
      }
      setPaintActive(false); setPaintPerson(null);
      setPaintStart(null);   setPaintEnd(null);
      paintMovedRef.current = false;
    }
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
    };
  }, [paintActive, paintPerson, paintStart, paintEnd, onEdit]);

  function handleCellDown(person, ds, e) {
    e.preventDefault();
    setPaintActive(true); setPaintPerson(person);
    setPaintStart(ds);    setPaintEnd(ds);
    paintMovedRef.current = false;
  }

  function handleCellEnter(person, ds) {
    if (paintActive && person === paintPerson && ds !== paintEnd) {
      setPaintEnd(ds);
      if (ds !== paintStart) paintMovedRef.current = true;
    }
  }

  function handleCellClick(person, ds, match) {
    if (paintMovedRef.current) return;
    if (match) { onEdit(match); }
    else { onEdit({ __paintNew: true, person, start_date: ds, end_date: ds }); }
  }

  function isPaintHighlighted(person, ds) {
    if (!paintActive || person !== paintPerson || !paintStart) return false;
    const end = paintEnd || paintStart;
    const a = paintStart <= end ? paintStart : end;
    const b = paintStart <= end ? end : paintStart;
    return ds >= a && ds <= b;
  }

  function getCellStyle(match) {
    if (!match) return null;
    const isTravel = match.type === 'Travel';
    const isEvent  = match.type === 'Event';
    const hatched  = COMMIT_HATCHED[match.commitment];
    const opacity  = COMMIT_OPACITY[match.commitment] ?? 0.8;
    if (isTravel) {
      return {
        background: `repeating-linear-gradient(55deg,
          ${TYPE_COLOR.Travel} 0px, ${TYPE_COLOR.Travel} 4px,
          transparent 4px, transparent 10px)`,
        opacity: 0.85,
      };
    }
    if (isEvent) return { background: TYPE_COLOR.Event, opacity };
    const base = locationColor(match.location);
    if (hatched) {
      return {
        background: `repeating-linear-gradient(45deg,
          ${base} 0px, ${base} 3px,
          rgba(255,255,255,0.55) 3px, rgba(255,255,255,0.55) 7px)`,
        opacity,
      };
    }
    return { background: base, opacity };
  }

  return (
    <div className="timeline-wrap">
      <div className="timeline-controls">
        <div className="range-pickers">
          <label>From
            <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
          </label>
          <span className="range-sep">→</span>
          <label>To
            <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
          </label>
          <span className="day-count">{days.length} days</span>
        </div>
        <div className="commit-legend">
          <span className="cl-title">Legend:</span>
          <span className="cl-swatch cl-fixed"   title="Fixed — fully booked">■ Fixed</span>
          <span className="cl-swatch cl-likely"  title="Likely — strong plan">■ Likely</span>
          <span className="cl-swatch cl-flexible" title="Flexible — tentative">▨ Flexible</span>
          <span className="cl-swatch cl-travel"  title="Travel day">✈ Travel</span>
          <span className="cl-swatch cl-event"   title="Event">🎉 Event</span>
        </div>
      </div>

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

      <div className="paint-hint">💡 <strong>Click</strong> a cell to add · <strong>Drag</strong> across a row to set a range</div>

      <div className="timeline-scroll">
        <table className="timeline-table"
          onMouseLeave={() => {
            if (paintActive) {
              setPaintActive(false); setPaintPerson(null);
              setPaintStart(null);   setPaintEnd(null);
              paintMovedRef.current = false;
            }
          }}>
          <thead>
            <tr className="month-row">
              <th className="name-col" />
              {monthSpans.map(ms => (
                <th key={ms.label} colSpan={ms.count} className="month-header">{ms.label}</th>
              ))}
            </tr>
            <tr className="dow-row">
              <th className="name-col" />
              {days.map(d => (
                <th key={d.toISOString()}
                  className={`day-col${isWeekend(d) ? ' weekend' : ''}`}
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
                    const ds    = format(day, 'yyyy-MM-dd');
                    const match = pEntries.find(e => ds >= e.start_date && ds <= e.end_date);
                    const hilit = isPaintHighlighted(person, ds);
                    const isFirst = match && (
                      ds === match.start_date ||
                      (parseISO(rangeStart) > parseISO(match.start_date) &&
                        ds === format(parseISO(rangeStart), 'yyyy-MM-dd'))
                    );
                    const fillStyle = getCellStyle(match);
                    const icon = match ? TYPE_ICON[match.type] : null;
                    const cellTitle = match
                      ? `${match.person} · ${match.type}${match.location ? ' · ' + match.location : ''} · ${match.commitment}${match.notes ? ' — ' + match.notes : ''}`
                      : `Click or drag to add for ${person}`;
                    return (
                      <td key={ds}
                        className={[
                          'day-cell',
                          isWeekend(day) ? 'weekend' : '',
                          hilit ? 'paint-hi' : '',
                          match ? `type-${(match.type||'stay').toLowerCase()}` : '',
                        ].filter(Boolean).join(' ')}
                        title={cellTitle}
                        onMouseDown={e => handleCellDown(person, ds, e)}
                        onMouseEnter={() => handleCellEnter(person, ds)}
                        onTouchStart={e => { e.preventDefault(); handleCellDown(person, ds, e); }}
                        onTouchMove={e => {
                          const t = e.touches[0];
                          const el = document.elementFromPoint(t.clientX, t.clientY);
                          if (el && el.dataset.ds && el.dataset.person === person)
                            handleCellEnter(person, el.dataset.ds);
                        }}
                        data-ds={ds}
                        data-person={person}
                        onClick={() => handleCellClick(person, ds, match)}
                      >
                        {match && (
                          <div className="day-fill" style={fillStyle}>
                            {icon && isFirst && <span className="commit-icon">{icon}</span>}
                          </div>
                        )}
                        {hilit && !match && <div className="paint-preview" />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="entry-list">
        {people.map(person => {
          const pEntries = entries
            .filter(e => e.person === person)
            .sort((a, b) => a.start_date.localeCompare(b.start_date));
          if (!pEntries.length) return null;
          return (
            <div key={person} className="entry-list-person">
              <div className="person-entry-name">{person}</div>
              <div className="entry-chips">
                {pEntries.map(e => (
                  <div key={e.id} className="entry-chip"
                    style={{ borderLeft: `4px solid ${e.type === 'Travel' ? TYPE_COLOR.Travel : e.type === 'Event' ? TYPE_COLOR.Event : locationColor(e.location)}` }}>
                    <span className="chip-type">{TYPE_ICON[e.type] || '🏠'}</span>
                    {e.location && <span className="chip-loc">{e.location}</span>}
                    <span className="chip-dates">{e.start_date} → {e.end_date}</span>
                    <span className={`chip-commit chip-${(e.commitment||'').toLowerCase()}`}>{e.commitment}</span>
                    <div className="chip-actions">
                      <button className="chip-btn" onClick={() => onEdit(e)} title="Edit">✏️</button>
                      <button className="chip-btn chip-del" onClick={() => onDelete(e.id)} title="Delete">🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
