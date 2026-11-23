# Circuit Book: working notes

Next.js 16 + Supabase PWA. See README.md for the stack, data model and scripts.

## Every change ships with three things

1. **A change log entry** in `src/content/changelog.json` (rules below).
2. **Guide coverage** for any new or changed screen: a `shot(...)` in
   `guide-capture/capture.mjs`, a slide in `src/app/tour/slides.tsx`, and a
   `<Shot>` on the Guide page. `npm run guide:check` enforces it.
3. **Checks passing:** `npx tsc --noEmit`, `npm run guide:check`,
   `npm run changelog:check`.

CI (`.github/workflows/circuit-book-guide.yml`) re-takes the screenshots on
every push and fails if app code changed without a change log entry.

## Change log

The full history of the app, oldest first, shown to admins at
`/admin/changelog` and, for announced entries, to users in the What's new
pop-up on Today. Add one entry per change a person would notice or need a
record of. Several related changes in one release can share an entry.

```json
{
  "seq": 12,
  "date": "2026-11-21",
  "kind": "new",
  "audience": "everyone",
  "announce": true,
  "title": "Short name of the change",
  "summary": "One or two plain sentences: what changed for the person reading.",
  "details": ["Optional bullets, one sentence each."],
  "link": { "href": "/library", "label": "Try it" },
  "commits": ["abc1234"]
}
```

- `seq`: the next number. Never renumber or reuse: people's "seen" markers point at it.
- `date`: the day it goes live, New York time. Entries stay in date order.
- `kind`: `new`, `improved`, `fixed`, or `internal` (tooling, infrastructure,
  admin setup; never announced).
- `audience`: `everyone`, or `admins` for admin-only features. Members never
  receive admin entries; the server filters them.
- `announce`: `true` to show it in What's new. Use `false` for changes nobody
  needs to be told about.
- Write for the person using the app, not for developers: no file names in
  `summary` for user-facing entries.
- `link` (optional): where to try it; shown as a button in What's new.
- `figure` (optional): a guide screenshot name to show with the entry. Guide
  screenshots carry numbered callouts, so use one only when it reads on its own.
- `commits`: add the short SHA in a follow-up if it isn't known yet. Optional.
- A commit that truly needs no record can say `[no changelog]` in its message.

## Roles

`member` (everyone) and `admin`, from `app_metadata.cb_role` on the Supabase
account (`src/lib/roles.ts`). Admin pages live under `/admin/` and are guarded
in `src/proxy.ts` and again in each page. Anything only admins may see is
rendered on the server; never import `src/lib/changelog.ts` into a client
component. Tour slides and Guide sections take an `audience` too.

## Domain

Production: https://circuitbook.mkcworkspace.com, live since 2026-11-22. DNS is
at GoDaddy: CNAME `circuitbook` to `f7c2714a3440f51b.vercel-dns-016.com`.

The old https://mkp-tools-circuit-book.vercel.app redirects there (308, set on
that domain in the Vercel project's Domains). Vercel Authentication still
covers previews and the other *.vercel.app aliases, but not the custom domain.

Sign-up confirmation links go back to the origin the person signed up on
(`emailRedirectTo` in `src/app/login/page.tsx`). The Supabase project is
shared with PingPath, so that origin must be listed under Authentication >
URL Configuration > Redirect URLs; otherwise Supabase falls back to the
project's Site URL, which isn't Circuit Book's.
