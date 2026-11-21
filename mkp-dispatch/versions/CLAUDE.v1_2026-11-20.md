<!--
  CLAUDE.md — working rules for anyone (person or AI) changing Dispatch It
  VERSION HISTORY
    v1  2026-11-20  Created with app.js v16: change log rule, roles,
                    hosting/deploy, commenting + versioning standard,
                    accounts to sign in with, and the test checklist.
-->

# Working on Dispatch It

Read this before changing anything in `mkp-dispatch/`. README.md explains
the system; this file lists the rules every change must follow.

## 1. Every change gets a change log entry (required)

The change log is `js/changelog.js`. It feeds two screens: the admin
**Change log** (#/admin) and the **What's new** card every device sees
once after an update. A change without an entry is invisible to the team.

In the **same update** as the code change:

1. Append one release object to the END of `CHANGELOG` (keep oldest first).
2. `id` = release date `YYYY-MM-DD`. A second release the same day is
   `YYYY-MM-DD.2`. Ids must stay unique and ascending.
3. One item per change people would notice:
   - `audience`: `everyone` (all devices see it) or `admin` (admin devices
     and the admin change log only).
   - `kind`: `new`, `improved`, `fixed`, `security`, `removed`, or
     `action` (something someone must do; shown first, in amber).
   - `text`: plain language, from the user's side of the screen. No file
     names, no jargon.
   - `detail` (optional, admin view only): versions, files, setting and
     secret **names**. Never secret values; this file ships to every
     browser.
4. `versions`: the file versions in this release, e.g. `app v17 · server v10`.
5. Run the change log check below. Deploy. Devices show the new notes on
   their next open.

Pure refactors with no visible effect still get an `admin` note with
kind `improved`, so the history stays complete.

## 2. Commenting and versioning standard (the owner's rule)

- Every file starts with a header: purpose, responsibilities and data
  flow, assumptions and dependencies, and a VERSION HISTORY block.
- Every function has a doc comment: what and why, parameters and
  returns, edge cases, failures.
- Non-obvious blocks get an inline comment on intent and trade-offs.
- New variables and config get a comment on purpose and expected values.
- Skipped edge cases get a `TODO:` saying what's missing, why it's safe
  for now, and how to fix it later.
- On every revision: add a line to the file's VERSION HISTORY, keep the
  live file name unchanged, and save a snapshot to
  `versions/<name>.v<N>_<YYYY-MM-DD>.<ext>` (worker/lib files use a
  `lib-` prefix). JSON files can't hold comments; their notes go in README.

## 3. Roles

- Team passcode (`APP_PASSCODE`) for everyone; admin passcode
  (`ADMIN_PASSCODE`) per device for admins (Settings → Admin).
- The Worker enforces admin-only routes (`ADMIN_ROUTES` in
  `worker/clickup-proxy.js`). Hiding a control in the app is only
  convenience; a new admin action must be added to `ADMIN_ROUTES` AND to
  `ADMIN_PATHS` in `js/clickup.js` (the app only sends the admin code on
  those paths).
- New ClickUp connections go live only after an admin confirms
  (`POST /oauth/confirm`); the OAuth callback itself is public.
- Deploy the server before the app when the app needs something new
  from it.
- New admin-only screens check `Routing.isAdmin()` and re-check with
  `Routing.role()`.

## 4. Where things live and how they deploy

| Part | Where | Deploy |
|---|---|---|
| App (static) | `dispatch.mkcworkspace.com`, Vercel project `mkp-tools-dispatch-it` (team "C3's projects") | Push to GitHub, then `npx vercel deploy --prod` from `mkp-dispatch` |
| App, old copy | `c1jumpw.github.io/mkp-tools/mkp-dispatch/` (GitHub Pages) | Updates on push; shows a "moved" notice |
| Server | Cloudflare Worker `dispatch-clickup-proxy` | `wrangler deploy` from `mkp-dispatch/worker` |
| Field Guide | `guide/index.html` + `guide/img/` | With the app |

Accounts: Cloudflare and GitHub as **c1.jumpw / c1jumpw**; Vercel as
**c3.jumpw**. Signing in with the wrong one causes "Authentication
error 10000" (wrangler) or "Permission denied to c3jumpw" (git).

DNS for mkcworkspace.com is at GoDaddy:
`CNAME dispatch → 2464471139e6a868.vercel-dns-016.com`.

## 5. Field Guide

When a screen changes, re-shoot its screenshot and its pin positions
together (`BOXES` at the bottom of `guide/index.html`), and update the
guide's text and VERSION HISTORY. Text-only fixes can be made directly.

## 6. Checks before shipping

- Change log: `node -e "const {CHANGELOG}=require('./js/changelog.js'); const ids=CHANGELOG.map(r=>r.id); if([...ids].sort().join()!==ids.join()||new Set(ids).size!==ids.length) throw 'ids out of order or repeated'; console.log('ok', ids.at(-1))"`
- Syntax: `node --check` each changed JS file.
- Worker changes: run the Worker tests (roles, CORS) before `wrangler deploy`.
- App changes: open the app, unlock, check Home, Settings (as member and
  admin), the Admin page and the What's new card.
- Never paste secrets into chat or code. Type them with `Read-Host`.
