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

## Stack

- **Frontend**: React + Leaflet (map) + date-fns
- **Backend**: Node.js / Express
- **Database**: Supabase (PostgreSQL, free tier, no spin-down)
- **Hosting**: Render (web service)

## Deploy

### 1. Create a Supabase database

1. Go to [supabase.com](https://supabase.com) → New project
2. Once created, go to **Settings → Database → Connection string → URI**
3. Copy the connection string (it looks like `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`)

### 2. Deploy to Render

1. Go to [render.com](https://render.com) → **New → Blueprint**
2. Connect this GitHub repo — Render reads `render.yaml`
3. After the service is created, go to its **Environment** tab in Render
4. Add an environment variable:
   - Key: `DATABASE_URL`
   - Value: *(paste your Supabase connection string)*
5. Trigger a manual deploy (or push any commit)
6. Share the `.onrender.com` URL with your family

> **Note:** The Render web service on the free tier will still spin down after inactivity.
> Upgrade to Render's $7/month Starter plan to keep it always-on, or use a free
> uptime monitor like [UptimeRobot](https://uptimerobot.com) to ping it every 5 minutes.

## Local Development

```bash
# Install dependencies
npm run install-all

# Start backend (port 4000)
cd server && npm run dev

# Start frontend (port 3000, proxies API to 4000)
cd client && npm start
```

Create `server/.env`:
```
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

The database tables are created automatically on first run.
