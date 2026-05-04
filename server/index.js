const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase requires SSL with rejectUnauthorized: false
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entries (
      id SERIAL PRIMARY KEY,
      person TEXT NOT NULL,
      location TEXT NOT NULL,
      lat REAL,
      lng REAL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      commitment TEXT NOT NULL DEFAULT 'Likely',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS gatherings (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      proposed_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS gathering_responses (
      id SERIAL PRIMARY KEY,
      gathering_id INTEGER REFERENCES gatherings(id) ON DELETE CASCADE,
      person TEXT NOT NULL,
      response TEXT NOT NULL,
      UNIQUE(gathering_id, person)
    );
  `);
  console.log('DB initialized');
}
initDB();

app.get('/api/entries', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM entries ORDER BY start_date');
  res.json(rows);
});

app.post('/api/entries', async (req, res) => {
  const { person, location, lat, lng, start_date, end_date, commitment, notes } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO entries (person, location, lat, lng, start_date, end_date, commitment, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [person, location, lat || null, lng || null, start_date, end_date, commitment, notes || '']
  );
  res.json(rows[0]);
});

app.put('/api/entries/:id', async (req, res) => {
  const { person, location, lat, lng, start_date, end_date, commitment, notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE entries SET person=$1, location=$2, lat=$3, lng=$4,
     start_date=$5, end_date=$6, commitment=$7, notes=$8 WHERE id=$9 RETURNING *`,
    [person, location, lat || null, lng || null, start_date, end_date, commitment, notes || '', req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/api/entries/:id', async (req, res) => {
  await pool.query('DELETE FROM entries WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/overlaps', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM entries ORDER BY start_date');
  const overlaps = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i], b = rows[j];
      if (a.person === b.person) continue;
      if (a.location.toLowerCase() !== b.location.toLowerCase()) continue;
      const start = new Date(Math.max(new Date(a.start_date), new Date(b.start_date)));
      const end   = new Date(Math.min(new Date(a.end_date),   new Date(b.end_date)));
      if (start <= end) {
        overlaps.push({
          people: [a.person, b.person],
          location: a.location,
          from: start.toISOString().split('T')[0],
          to:   end.toISOString().split('T')[0],
          commitments: [a.commitment, b.commitment],
        });
      }
    }
  }
  res.json(overlaps);
});

app.get('/api/gatherings', async (req, res) => {
  const { rows: gatherings } = await pool.query('SELECT * FROM gatherings ORDER BY start_date');
  const { rows: responses  } = await pool.query('SELECT * FROM gathering_responses');
  const result = gatherings.map(g => ({
    ...g,
    responses: responses.filter(r => r.gathering_id === g.id),
  }));
  res.json(result);
});

app.post('/api/gatherings', async (req, res) => {
  const { title, location, start_date, end_date, proposed_by } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO gatherings (title, location, start_date, end_date, proposed_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [title, location, start_date, end_date, proposed_by]
  );
  res.json({ ...rows[0], responses: [] });
});

app.post('/api/gatherings/:id/respond', async (req, res) => {
  const { person, response } = req.body;
  await pool.query(
    `INSERT INTO gathering_responses (gathering_id, person, response)
     VALUES ($1,$2,$3) ON CONFLICT (gathering_id, person) DO UPDATE SET response=$3`,
    [req.params.id, person, response]
  );
  res.json({ ok: true });
});

app.delete('/api/gatherings/:id', async (req, res) => {
  await pool.query('DELETE FROM gatherings WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/gaps', async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const { rows: entries } = await pool.query(
    `SELECT person, start_date, end_date FROM entries
     WHERE EXTRACT(YEAR FROM start_date)=$1 OR EXTRACT(YEAR FROM end_date)=$1`,
    [year]
  );
  const start = new Date(`${year}-06-01`);
  const end   = new Date(`${year}-08-31`);
  const gaps  = [];
  let gapStart = null;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = d.toISOString().split('T')[0];
    const covered = entries.some(e => e.start_date <= ds && e.end_date >= ds);
    if (!covered) {
      if (!gapStart) gapStart = ds;
    } else {
      if (gapStart) { gaps.push({ from: gapStart, to: new Date(d - 86400000).toISOString().split('T')[0] }); gapStart = null; }
    }
  }
  if (gapStart) gaps.push({ from: gapStart, to: end.toISOString().split('T')[0] });
  res.json(gaps);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
