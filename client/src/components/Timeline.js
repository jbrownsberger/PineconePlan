import React, { useMemo } from 'react';
import { eachDayOfInterval, format, isWeekend } from 'date-fns';
import './Timeline.css';

const COMMIT_COLORS = { Fixed: '#e94560', Likely: '#f4a261', Flexible: '#2ec4b6' };

export default function Timeline({ entries, people, year, onEdit, onDelete }) {
  const days = useMemo(() =>
    eachDayOfInterval({ start: new Date(`${year}-06-01`), end: new Date(`${year}-08-31`) }),
    [year]
  );

  return (
    <div className="timeline-wrap">
      <div className="legend">
        {Object.entries(COMMIT_COLORS).map(([k, v]) => (
          <span key={k} className="legend-item">
            <span className="legend-dot" style={{ background: v }} />{k}
          </span>
        ))}
      </div>
      <div className="timeline-scroll">
        <table className="timeline-table">
          <thead>
            <tr>
              <th className="name-col">Person</th>
              {days.map(d => (
                <th key={d} className={`day-col ${isWeekend(d) ? 'weekend' : ''}`}
                  title={format(d, 'MMM d')}>
                  {format(d, 'd') === '1' ? format(d, 'MMM d') : format(d, 'd')}
                </th>
              ))}
              <th>Entries</th>
            </tr>
          </thead>
          <tbody>
            {people.map(person => {
              const pEntries = entries.filter(e => e.person === person);
              return (
                <tr key={person}>
                  <td className="name-col"><strong>{person}</strong></td>
                  {days.map(day => {
                    const ds = format(day, 'yyyy-MM-dd');
                    const match = pEntries.find(e => ds >= e.start_date && ds <= e.end_date);
                    return (
                      <td key={day} className="day-cell"
                        title={match ? `${match.location} (${match.commitment})${match.notes ? ' — ' + match.notes : ''}` : ''}>
                        {match && <div className="day-fill" style={{ background: COMMIT_COLORS[match.commitment] }} />}
                      </td>
                    );
                  })}
                  <td>
                    {pEntries.map(e => (
                      <div key={e.id} className="entry-chip" style={{ borderLeft: `4px solid ${COMMIT_COLORS[e.commitment]}` }}>
                        <span>{e.location} ({e.start_date} → {e.end_date})</span>
                        <button onClick={() => onEdit(e)}>✏️</button>
                        <button onClick={() => onDelete(e.id)}>🗑️</button>
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
