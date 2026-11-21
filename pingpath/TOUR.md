# Keeping the change log, update notes and tour current

PingPath has four kinds of help, and every update has to keep them in step:

- **Change log** (`src/data/changelog.json`): every update since launch, newest first. Admins read it at Settings › Admin (`/admin`), and can download it as CSV or JSON. It's plain data so it can be kept and reused outside the app.
- **What's new**: a popup the first time someone opens PingPath after an update (once per account, on any device; `src/components/updates/WhatsNew.tsx`). It lists every update they haven't seen, trimmed to the changes that apply to them: `audience: "everyone"` goes to everybody, `audience: "admin"` only to admins. What each account has seen is stored in the `pingpath_user_prefs` table.
- **Getting started tour** (`/tour`): step-by-step slides. Each step shows a *live sample screen*: the real app component rendered with sample people (`src/lib/tour/fixtures.ts`) inside a phone frame, with numbered callouts placed on the real elements.
- **Guide** (`/guide`): the illustrated reference page.

Because the tour renders the real components, any visual change to a screen shows up in the tour automatically. What can go stale is the *words* and the *callouts*, so every change follows this checklist.

## Checklist for every update

1. **Change log.** Bump `version` in `package.json` and add an entry at the top of `src/data/changelog.json` with the same version, today's date (`YYYY-MM-DD`), a title, and one item in `changes` per change:
   - `kind`: `new`, `improved`, `fixed` or `behind-the-scenes`
   - `area`: `App`, `Home`, `Contacts`, `Tags`, `Blasts`, `Blast Deck`, `Settings`, `Help`, `Accounts`, `Setup` or `Admin`
   - `audience`: `everyone` or `admin` (who it applies to, and so who sees it in What's new)
   - `title`, `detail`, and optionally `slide` (a tour step that shows it)
   - `slides` on the entry: the steps the tour's What's new track should show (pick everyone-track steps)
   - After publishing, add the production deployment id to the entry's `deployments`.
2. **Changed or new feature on an existing screen?** Edit its steps in `src/lib/tour/slides.ts`: title, text, and `callouts` (each callout finds its element by `sel`, `text`, `up`, `nth`; see `src/lib/tour/find.ts`).
3. **New page?** Add a step whose `covers` lists the route (for example `"/contacts/[id]"`). If it needs a sample screen, add an id to `SCREEN_IDS` in `src/lib/tour/screens.ts`, render it in `src/components/tour/TourScreen.tsx`, and add a route at `src/app/<section>/tour/[screen]/page.tsx` if the section doesn't have one yet.
4. **Guide.** Update the matching section of `src/app/(app)/guide/page.tsx` if its drawings or text no longer match.
5. **Check.** `npm run tour:check`, then open `/tour` and step through what changed.

## What the build enforces

`npm run build` runs `scripts/check-tour.mjs` first, and the deploy fails if:

- `package.json`'s version has no change log entry at the top of `src/data/changelog.json`,
- change log entries aren't newest first (versions and dates), a date is in the future or not `YYYY-MM-DD`,
- an entry has no changes, or a change is missing its kind, area, title or audience,
- a change log entry points to a tour step that doesn't exist,
- a page in `src/app` isn't covered by any tour step (or listed in `UNTOURED` with a reason),
- a step covers a page that no longer exists, or uses a sample screen that doesn't exist.

It can't tell whether the words are still right; that's the checklist.

## Roles

Admins are rows in the `pingpath_roles` table (role `admin`). The app can only read a person's own row; add or remove admins in the Supabase dashboard (project mkp-tools › Table editor › `pingpath_roles`). Admins see Settings › Admin and admin-only update notes. Nobody, admins included, can see another person's board.

## Sample screens are read-only

Tour screens only render inside the tour's frame. There they block saving (server actions) and page loads, keep their own copy of remembered filters, and are made un-clickable. Opened directly, they show a short note instead.
