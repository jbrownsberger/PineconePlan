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
- **Database**: PostgreSQL
- **Hosting**: Render (free tier)

## Deploy to Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect this repo — Render reads `render.yaml` and provisions everything automatically
4. Share the `.onrender.com` URL with your family

## Local Development

```bash
# Install dependencies
npm run install-all

# Start backend (port 4000)
cd server && npm run dev

# Start frontend (port 3000, proxies API to 4000)
cd client && npm start
```

Set `DATABASE_URL` in a `.env` file in the `server/` directory for local Postgres.
