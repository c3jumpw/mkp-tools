# PingPath

A personal outreach board: contacts and tags, blasts (a list of people plus the
messages you send them in steps), the Blast Deck for sending one step to
everyone a card at a time, and birthdays and special dates on Home, synced from
a Google birthdays calendar. PingPath never sends anything itself: every
message opens in the person's own Messages, WhatsApp, Mail or Instagram,
already written.

Live at **https://pingpath.mkcworkspace.com** (also https://pingpath-two.vercel.app).

## Stack

- Next.js 16 (App Router, Turbopack), React 19, Tailwind 4
- Supabase (project **mkp-tools**, shared with Circuit Book): auth and data, all
  tables prefixed `pingpath_` with row-level security, so each login only sees
  its own board
- Hosted on Vercel, project **pingpath** (root directory `pingpath`), linked to
  this repo: every push to `main` that touches `pingpath/` goes live; pushes
  that only change the other apps are skipped

## Help that ships with the app

- **Change log**: `src/data/changelog.json`, shown to admins at `/admin`
  (Settings › Admin) and, trimmed to what applies to them, to everyone in the
  What's new popup the first time they open the app after an update.
- **Getting started tour**: `/tour`, real screens with sample people
  (`src/lib/tour/`).
- **Guide**: `/guide`.

Every update keeps these in step; `npm run build` refuses to build if it
doesn't. The checklist is in [TOUR.md](TOUR.md).

## Scripts

```bash
npm install
npm run dev          # needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example)
npm run tour:check   # change log, tour and page coverage
npm run build        # runs tour:check first
```

## Environment

See `.env.example`. Real values live in Vercel › pingpath › Settings ›
Environment Variables; never commit them.

## Roles

Admins are rows in the `pingpath_roles` table (role `admin`), added in the
Supabase dashboard. The app can only read a person's own row.
