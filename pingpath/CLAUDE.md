# PingPath: working notes

Next.js 16 + Supabase PWA. See README.md for the stack and TOUR.md for the full
checklist.

## Every change ships with

1. **A change log entry** at the top of `src/data/changelog.json`, with
   `version` matching a bumped `package.json` version, today's date, and one
   item per change: `kind` (new, improved, fixed, behind-the-scenes), `area`,
   `audience` (`everyone` or `admin`: decides who sees it in What's new),
   `title`, `detail`, optional `slide`. After it's live, add the production
   deployment id to the entry's `deployments`.
2. **Tour and guide coverage** for any new or changed screen:
   `src/lib/tour/slides.ts` (every page needs a step's `covers`), sample
   screens in `src/components/tour/TourScreen.tsx`, and
   `src/app/(app)/guide/page.tsx`.
3. **Checks passing**: `npm run tour:check` and `npx tsc --noEmit`.
   `npm run build` runs the tour check first and fails without it.

## Data

Supabase project mkp-tools (shared with Circuit Book). PingPath tables are
`pingpath_*`, all with row-level security scoped to `auth.uid()`. Never print
or commit environment values.
