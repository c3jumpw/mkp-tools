# Circuit Book

A workout library, a routine planner, and a station-by-station session tracker.
Installable to a phone's home screen and built to stay usable in a basement gym
or on a field with no signal.

## What it does

**Library** — every lift and drill you actually do, each with a photo, a target
(`4 × 8`, or `3 × 30s` for timed work), a category, and the cues you want in
front of you mid-set.

**Routines** — an ordered set of stations. Assign a routine to any days of the
week; a day can hold more than one, and a routine can run on several days. Sets
and reps can be overridden per routine without touching the library entry.

**Session mode** — one station at a time, full screen. Swipe or tap through,
mark each one done, swap a station for something else on the spot. The station
number and the target are sized to be read at arm's length while you are out of
breath.

**History** — what you finished, how much of it, and how long it took.

## Design

A circuit is a numbered sequence of stations, so the interface borrows from the
placard bolted to a gym wall: a large station number, a large target, and
everything else kept quiet. Lime is reserved for state — something is happening
now, or it is done — and never used as decoration. Type is Archivo at two
widths, expanded for headings so they read as signage, normal for everything
else; it is self-hosted so the app renders with no network.

## Offline behaviour

The service worker caches the app shell, the build output, and station photos,
so the app opens without a connection. Ticking off a station writes to a local
queue that survives a reload and flushes on reconnect, with the timestamp from
the moment of the tap rather than the moment it synced. The running session is
also snapshotted to the device, so closing the app mid-workout loses nothing.

Reads and writes against the database are never cached — a stale library or a
silently diverging session would be worse than an error.

## Stack

- Next.js (App Router) and TypeScript
- Tailwind CSS v4, with the palette defined as theme tokens in `globals.css`
- Supabase for Postgres, auth, and photo storage
- Deployed on Vercel

## Data model

All tables are prefixed `cb_` and every row is scoped to its owner by row level
security, so the project can be shared with other apps.

| Table | Holds |
| --- | --- |
| `cb_workouts` | The library. Name, target, category, photo path. |
| `cb_routines` | Named routines. |
| `cb_routine_days` | Which days each routine runs on. |
| `cb_routine_items` | Ordered stations in a routine, with per-routine overrides. |
| `cb_sessions` | One logged workout. |
| `cb_session_items` | The stations of that session, and when each was completed. |

Session rows copy the workout's details at the moment the session starts, so
editing or deleting a library entry later never rewrites what was actually done
that day.

Photos live in a private `cb-workout-images` bucket under `<user_id>/<file>`,
with storage policies matching on that folder prefix. The app signs URLs on
demand and caches them, and shrinks every photo in the browser before upload.

## Running it locally

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm run dev
```

The service worker only registers in production builds, so `npm run dev` stays
free of stale caches. To exercise the offline path, run `npm run build && npm
start`.

### Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key. Safe in the browser; row level security does the enforcing. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` | Production build. |
| `npm start` | Serve the production build. |
| `npm run typecheck` | Type check without emitting. |
| `python3 scripts/make-icons.py` | Regenerate the app icons. |
