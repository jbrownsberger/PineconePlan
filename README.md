# 🗺️ PineconePlan — Family Summer Planner

A shared web app for coordinating family summer plans. Each family member can enter where they'll be and when, mark how firm their plans are, and the app automatically surfaces location overlaps and uncovered windows.

## Features

- **Timeline view** — Gantt-style swimlane of the full summer (June–August) per person
- **Map view** — See where everyone is on any given date
- **Overlap detection** — Automatically flags when two people will be in the same place
- **Gap detection** — Warns when no one has any plans entered for a stretch
- **Proposed gatherings** — Propose a meetup; everyone RSVPs In / Maybe / Out
- **Commitment levels** — 🔒 Fixed (booked), 📅 Likely (strong plan), 🔄 Flexible (can change)
- **No login required** — Share one URL; each person picks their name when submitting
- **Instant page load** — Frontend served from Render CDN; backend wakes in background

## Architecture

```
Render Static Site  (pineconeplan)          ← CDN, never spins down
      ↓ fetch()
Render Web Service  (pineconeplanbackend)   ← Express API, may spin down on free tier
      ↓ pg
Supabase PostgreSQL                         ← Free tier, never spins down
```

The React frontend pings `/api/health` on load and shows a “Waking up…” indicator
until the backend responds. Data loads automatically once the backend is live.

## Stack

- **Frontend**: React + Leaflet (map) + date-fns, hosted as Render Static Site
- **Backend**: Node.js / Express, hosted as Render Web Service
- **Database**: Supabase (PostgreSQL, free tier)

## Deploy

### 1. Create a Supabase database

1. Go to [supabase.com](https://supabase.com) → New project
2. Go to **Settings → Database → Connection string → URI**
3. Copy the connection string (`postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`)

### 2. Deploy via Render Blueprint

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect this GitHub repo — Render reads `render.yaml` and creates both services
3. In the **pineconeplanbackend** service → **Environment** tab, add:
   - `DATABASE_URL` = *(your Supabase connection string)*
4. Trigger a manual redeploy of both services
5. Share the `pineconeplan.onrender.com` URL with your family

> **Tip:** The API service on the free tier still spins down after 15 min of inactivity,
> but the frontend loads instantly from the CDN regardless. The in-app wake-up indicator
> handles the user experience gracefully.

## Local Development

```bash
# Install dependencies
npm run install-all

# Terminal 1 — backend on port 4000
cd server && npm run dev

# Terminal 2 — frontend on port 3000 (proxies /api to 4000 via package.json proxy)
cd client && npm start
```

Create `server/.env`:
```
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

The database tables are created automatically on first run.
