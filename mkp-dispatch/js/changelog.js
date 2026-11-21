/**
 * =========================================================================
 * changelog.js — Dispatch It release history (single source of truth)
 * =========================================================================
 * PURPOSE
 *   Every change to Dispatch It, in chronological order (oldest first),
 *   as structured data. Two screens read it:
 *     - Admin page → Change log (#/admin): every note, with technical
 *       detail, filters, search, either order, and "Copy as text".
 *     - What's new (sheet after an update + #/whats-new): only the notes
 *       for the viewer's role, and only releases they haven't seen.
 *   Kept as data (not prose) so it can be filtered, exported, or moved to
 *   another tool later without rewriting it.
 *
 * HOW TO ADD A RELEASE (also in CLAUDE.md and README → Change log)
 *   1. Append ONE object to the END of CHANGELOG (keep chronological).
 *   2. id: the release date 'YYYY-MM-DD'. A second release on the same
 *      day uses 'YYYY-MM-DD.2' (ids are compared as strings, and
 *      '2026-11-20' < '2026-11-20.2', so order still holds).
 *   3. One item per user-visible change. audience 'everyone' shows to all;
 *      'admin' only on admin devices. kind is one of KINDS below.
 *      text is plain language from the user's side of the screen; put
 *      file names, versions and secrets' NAMES (never values) in detail.
 *   4. Ship it with the change. Devices show the new release's notes
 *      once, on the next open after the update.
 *
 * DATA SHAPE
 *   {
 *     id: string        'YYYY-MM-DD' (or '.2' suffix), unique, ascending
 *     date: string      'YYYY-MM-DD' (display)
 *     title: string     short headline for the release
 *     versions: string  technical version tags (admin view only)
 *     items: [{
 *       audience: 'everyone' | 'admin',
 *       kind: 'new' | 'improved' | 'fixed' | 'security' | 'removed' | 'action',
 *       text: string,   what changed, plain language
 *       detail?: string technical note (admin change log only)
 *     }]
 *   }
 *
 * ASSUMPTIONS
 *   - Loaded before app.js (index.html). No dependencies, no network.
 *   - History before 2026-11-20 was compiled from each file's VERSION
 *     HISTORY block (app.js v1–v15, server v1–v8, config, storage, styles,
 *     service worker, wrangler.toml, README). The 2026-10-11 entry records
 *     the first smart-routing deploy, which no file history mentions.
 *   - It's shipped to every browser, so it must never contain secrets.
 *     The admin/everyone split controls what's SHOWN, not what's private.
 *
 * -------------------------------------------------------------------------
 * VERSION HISTORY
 *   v1  2026-11-20  Created with the full history (13 releases, 64 notes,
 *                    Jul 23 → Nov 20) and the Changelog helpers used by
 *                    app.js v16.
 *   v2  2026-11-21  Finalized the Nov 20 release before it went live (it
 *                    ships on Nov 21): address notes say
 *                    dispatchit.mkcworkspace.com (the DNS record's name,
 *                    kept by the owner; "dispatch" was the plan); the two
 *                    terminal instructions (set the admin passcode, Vercel
 *                    CLI deploy) were replaced by notes that the passcode
 *                    is set, that pushes deploy everything, and that the
 *                    code moved to c3jumpw/mkp-tools; versions
 *                    updated to what ships. Kept as ONE release on purpose:
 *                    every device on the new address is "new" to What's
 *                    new, and pending() shows a new device only the latest
 *                    release, so a separate admin-only Nov 21 release would
 *                    have hidden the move notes from everyone. Helpers
 *                    unchanged.
 * =========================================================================
 */

const CHANGELOG = [
  {
    id: '2026-07-23',
    date: '2026-07-23',
    title: 'First version',
    versions: 'app v1–v2 · server v1–v2 · config v1–v4',
    items: [
      { audience: 'everyone', kind: 'new', text: 'Capture tasks, ideas and notes from your phone: pick the business, pick the type, fill a short form, and it lands in the right ClickUp list.' },
      { audience: 'everyone', kind: 'new', text: 'Dictation, voice notes and file attachments on captures.' },
      { audience: 'everyone', kind: 'new', text: 'Captures made offline are kept on the device and sent when you’re back online.' },
      { audience: 'admin', kind: 'new', text: 'Destinations come from a map of the ClickUp workspace export.', detail: 'js/config.js v1' },
      { audience: 'admin', kind: 'security', text: 'Dispatch connects to ClickUp as its own app instead of a shared personal token, which had been revoked. The ClickUp access lives only on the server.', detail: 'server v2 · wrangler v2: CLICKUP_CLIENT_SECRET secret, TOKEN_STORE KV · token error OAUTH_025' },
      { audience: 'admin', kind: 'improved', text: 'Each device finds the server by itself. No setup needed per device.', detail: 'config v2 DEFAULT_PROXY_URL · storage v2' }
    ]
  },
  {
    id: '2026-07-24',
    date: '2026-07-24',
    title: 'Passcode lock',
    versions: 'app v3 · server v3 · config v5',
    items: [
      { audience: 'everyone', kind: 'security', text: 'The app asks for the team passcode once on each device.' },
      { audience: 'everyone', kind: 'new', text: 'Tasks have a Start date.' },
      { audience: 'everyone', kind: 'improved', text: 'Settings checks the ClickUp connection every time it opens.' },
      { audience: 'everyone', kind: 'improved', text: 'The “verify this list” flag explains itself when tapped. It used to need a mouse hover.' },
      { audience: 'admin', kind: 'security', text: 'Closed a gap where anyone who found the app’s address could create tasks in ClickUp. The server now checks the passcode on every request.', detail: 'server v3 · APP_PASSCODE secret' }
    ]
  },
  {
    id: '2026-07-25',
    date: '2026-07-25',
    title: 'Assignees, subtasks and the activity feed',
    versions: 'app v4–v6 · server v4–v5 · config v6–v8 · README v1',
    items: [
      { audience: 'everyone', kind: 'new', text: 'Assign a task to a teammate from the form.' },
      { audience: 'everyone', kind: 'new', text: 'Make a capture a subtask of an existing task. Search by name or paste a task ID.' },
      { audience: 'everyone', kind: 'new', text: '“View in ClickUp” link on each Recent item.' },
      { audience: 'everyone', kind: 'new', text: 'Refresh button on Home, so installed home-screen apps can load the newest version.' },
      { audience: 'everyone', kind: 'improved', text: 'Files over the upload limit are flagged before you tap Send.' },
      { audience: 'admin', kind: 'new', text: 'Each capture posts a short note to a ClickUp Chat channel, so activity is visible in one place.', detail: 'server v4–v5: /log/chat · CHAT_CHANNEL_ID verified as 4-90170798185-8' },
      { audience: 'admin', kind: 'fixed', text: 'Four destinations pointed at the wrong lists because of copy-paste IDs in the original export.', detail: 'config v6' },
      { audience: 'admin', kind: 'new', text: 'Setup guide written.', detail: 'README v1' }
    ]
  },
  {
    id: '2026-07-26',
    date: '2026-07-26',
    title: 'Follow-ups and Add to Accounts',
    versions: 'app v7 · server v6 · config v9–v10',
    items: [
      { audience: 'everyone', kind: 'new', text: 'Follow-up / Reminder for every business. It adds a note to an existing task instead of creating a new one.' },
      { audience: 'everyone', kind: 'new', text: 'Add to Accounts (Super Admin) records a login or tool account and posts it to the accounts review channel.' },
      { audience: 'everyone', kind: 'improved', text: 'Renamed “Contact Follow-up” to “New Contact Activity”, and “Meeting Note” to “New Meeting/Apt/Event”.' },
      { audience: 'everyone', kind: 'removed', text: 'Removed Super Admin’s “Client Account Note”. Add to Accounts covers it.' },
      { audience: 'admin', kind: 'security', text: 'Account passwords are never kept in the Recent list on the device.' }
    ]
  },
  {
    id: '2026-07-28',
    date: '2026-07-28',
    title: 'Accounts can go straight to the list',
    versions: 'app v8 · config v11',
    items: [
      { audience: 'everyone', kind: 'new', text: 'Add to Accounts can file straight into the MKC Client Accounts list instead of the review channel.' }
    ]
  },
  {
    id: '2026-08-07',
    date: '2026-08-07',
    title: 'Accounts fill real ClickUp fields',
    versions: 'app v9 · server v7 · README v2',
    items: [
      { audience: 'everyone', kind: 'improved', text: '“Direct to List” fills the list’s own username, email and password fields instead of only the description.' },
      { audience: 'everyone', kind: 'improved', text: 'Direct-to-List entries also post a note to the review channel, so all account activity stays in one place.' },
      { audience: 'everyone', kind: 'improved', text: '“Direct to List” is only offered for MKC Client accounts, the only type with a list.' },
      { audience: 'admin', kind: 'new', text: 'An optional GitHub workflow can deploy the server on every push. It stays off until a Cloudflare token is added to the repo.', detail: '.github/workflows/deploy-worker.yml · CLOUDFLARE_API_TOKEN (not set)' }
    ]
  },
  {
    id: '2026-08-08',
    date: '2026-08-08',
    title: 'Link accounts to their client',
    versions: 'app v10 · config v12',
    items: [
      { audience: 'everyone', kind: 'new', text: 'Pick the client company when adding an MKC Client account.' },
      { audience: 'everyone', kind: 'improved', text: 'The password field shows plain text. Masking added friction without adding protection.' }
    ]
  },
  {
    id: '2026-08-11',
    date: '2026-08-11',
    title: 'Errors no longer hide',
    versions: 'app v11–v12',
    items: [
      { audience: 'everyone', kind: 'fixed', text: 'A capture ClickUp rejects now shows an error instead of waiting in the queue forever.' },
      { audience: 'everyone', kind: 'fixed', text: 'One rejected capture no longer holds up the others waiting behind it.' },
      { audience: 'admin', kind: 'fixed', text: 'Stopped writing two account fields in formats ClickUp refuses, which had made whole captures fail.', detail: 'ClickUp error FIELD_011 on “Tool/Software/Act”; associated-account guess removed' }
    ]
  },
  {
    id: '2026-08-12',
    date: '2026-08-12',
    title: 'Related Account ID',
    versions: 'app v13',
    items: [
      { audience: 'admin', kind: 'fixed', text: 'The client link is written to the “Related Account ID” field, and only when that field accepts plain text.', detail: 'TEXT_LIKE_FIELD_TYPES gate' }
    ]
  },
  {
    id: '2026-10-10',
    date: '2026-10-10',
    title: 'Dispatch It: smart routing',
    versions: 'app v14 · server v8 · config v13 · storage v4 · sw v3',
    items: [
      { audience: 'everyone', kind: 'new', text: 'Renamed to Dispatch It, with a new icon.' },
      { audience: 'everyone', kind: 'new', text: 'Smart capture: type or say it once and Gemini picks the list, title, dates and priority. Confident captures file themselves, with Undo.' },
      { audience: 'everyone', kind: 'new', text: 'A Confirm screen for anything uncertain, with the reason, a score breakdown and other likely lists.' },
      { audience: 'everyone', kind: 'new', text: 'Duplicate check: when the same work already exists, add your note to it instead of making a copy.' },
      { audience: 'everyone', kind: 'new', text: 'Activity: every send from every device, with two-tap Undo.' },
      { audience: 'everyone', kind: 'new', text: 'New ClickUp lists appear under “More lists in this space” without an app update.' },
      { audience: 'everyone', kind: 'improved', text: 'Forms save drafts as you type.' },
      { audience: 'everyone', kind: 'improved', text: 'Clear messages with a next step replace pop-up alerts.' },
      { audience: 'everyone', kind: 'fixed', text: 'Dates no longer land a day early in US time zones.' },
      { audience: 'everyone', kind: 'fixed', text: 'A send that timed out can no longer create the same task twice.' },
      { audience: 'everyone', kind: 'fixed', text: 'Phones no longer keep showing an old version after an update.' },
      { audience: 'everyone', kind: 'security', text: 'Add to Accounts details are never saved on the device, not even in the offline queue.' },
      { audience: 'admin', kind: 'new', text: 'Smart routing settings: auto-file threshold, duplicate strictness, workspace sync, task index and live updates.', detail: 'server v8 · Gemini (gemini-3.8-flash, gemini-embedding-2) · Vectorize index dispatch-tasks · 15-minute cron · ClickUp webhook' },
      { audience: 'admin', kind: 'security', text: 'The server only forwards the exact ClickUp actions the app uses, and only accepts a ClickUp connection that can see the MKC workspace.' },
      { audience: 'admin', kind: 'security', text: 'Private lists (MKC Client Accounts) are never sent to Gemini.', detail: 'PRIVATE_LIST_IDS = 901711853904' }
    ]
  },
  {
    id: '2026-10-11',
    date: '2026-10-11',
    title: 'Smart routing goes live',
    versions: 'server v8 deployed',
    items: [
      { audience: 'admin', kind: 'action', text: 'Server deployed with the Gemini key and the duplicate index. Deploys must be signed in as c1.jumpw on Cloudflare and c1jumpw on GitHub.', detail: 'First attempts failed: wrangler signed in as c3.jumpw (Authentication error 10000); git push denied to c3jumpw (cached Windows credential).' }
    ]
  },
  {
    id: '2026-10-30',
    date: '2026-10-30',
    title: 'Field Guide',
    versions: 'app v15 · ui v2 · sw v4 (released with the Nov 20 update)',
    items: [
      { audience: 'everyone', kind: 'new', text: 'Field Guide: every screen and setting explained with pictures. Open it from the lock screen, Home, or Settings → Help. Works offline.' },
      { audience: 'everyone', kind: 'fixed', text: 'The “passcode rejected” message pointed to a button that doesn’t exist. It now says Settings → Forget passcode on this device.' }
    ]
  },
  {
    id: '2026-11-20',
    date: '2026-11-20',
    title: 'What’s new, admin access and a new address',
    versions: 'app v16 · server v9 · config v15 · wrangler v8 · guide v3 (live Nov 21)',
    items: [
      { audience: 'everyone', kind: 'new', text: 'Dispatch It has a new address: dispatchit.mkcworkspace.com.' },
      { audience: 'everyone', kind: 'action', text: 'Use dispatchit.mkcworkspace.com from now on, and add it to your home screen if you haven’t. You enter the passcode once there. The old address shows a link to it for now.' },
      { audience: 'everyone', kind: 'new', text: 'What’s new: after each update you see the changes that apply to you, once. Settings → Help → What’s new shows them any time.' },
      { audience: 'everyone', kind: 'improved', text: 'Smart routing controls in Settings are admin-only now. Everyone still sees whether it’s working.' },
      { audience: 'everyone', kind: 'improved', text: 'The Field Guide covers What’s new, Settings for everyone, admin access and the change log.', detail: 'guide v2 · 26 screenshots' },
      { audience: 'admin', kind: 'new', text: 'Admin access: unlock it once per device in Settings → Admin with the admin passcode. The server blocks admin actions for everyone else.', detail: 'server v9 · ADMIN_PASSCODE secret · X-Dispatch-Admin header · GET /auth/role · admin-only: routing settings, sync, live updates, task index, Chat channel lookup' },
      { audience: 'admin', kind: 'new', text: 'Admin page with this change log: the full history in either order, with filters, search and Copy as text.', detail: 'js/changelog.js is the source; #/admin' },
      { audience: 'admin', kind: 'security', text: 'A new ClickUp connection only goes live after an admin device confirms it. Before, anyone with access to the workspace could replace the shared connection through the public approval link.', detail: 'server v9: OAuth callback parks the token 15 min (access_token_pending); POST /oauth/confirm (admin-only). Only once ADMIN_PASSCODE is set.' },
      { audience: 'admin', kind: 'new', text: 'The app is hosted on Vercel now. The old GitHub Pages copy keeps working and points people to the new address.', detail: 'Vercel project mkp-tools-dispatch-it (team C3’s projects) · GoDaddy DNS: CNAME dispatchit → 2464471139e6a868.vercel-dns-016.com (the plan was dispatch.mkcworkspace.com; renamed to match the DNS record before release) · vercel.json, .vercelignore' },
      { audience: 'admin', kind: 'improved', text: 'Updates go live on their own: a push to main on GitHub redeploys the server and the app. No terminal needed. The code now lives in the c3jumpw account’s mkp-tools repo.', detail: 'Moved from c1jumpw/mkp-tools to c3jumpw/mkp-tools (Vercel’s free plan only deploys repos owned by the team’s GitHub login) · Cloudflare Workers Builds on dispatch-clickup-proxy (root mkp-dispatch/worker, npx wrangler deploy, watch path mkp-dispatch/worker/*) · Vercel Git link (root mkp-dispatch) · the old address (c1jumpw.github.io) stays on app v15 with a moved bar' },
      { audience: 'admin', kind: 'security', text: 'The admin passcode is set. Admin controls on each device need it once: Settings → Admin → Unlock admin.', detail: 'ADMIN_PASSCODE secret, set 2026-11-21 in the Cloudflare dashboard (Worker → Settings → Variables and secrets)' },
      { audience: 'admin', kind: 'action', text: 'Once every device has moved, remove the old address from ALLOWED_ORIGIN. The server redeploys itself when the change is pushed.', detail: 'worker/wrangler.toml · ALLOWED_ORIGIN = "https://dispatchit.mkcworkspace.com"' }
    ]
  }
];

const Changelog = (() => {
  // Labels + order for the kinds an item can have (filters and badges).
  const KINDS = {
    new: 'New',
    improved: 'Improved',
    fixed: 'Fixed',
    security: 'Security',
    removed: 'Removed',
    action: 'Action needed'
  };

  /**
   * all — every release, oldest first (the order in CHANGELOG).
   * @returns {object[]}
   */
  function all() {
    return CHANGELOG.slice();
  }

  /**
   * latest — the newest release (the one this build ships).
   * @returns {object|null}
   */
  function latest() {
    return CHANGELOG.length ? CHANGELOG[CHANGELOG.length - 1] : null;
  }

  /**
   * itemsFor — one release's notes that a role should see.
   * @param {object} release
   * @param {'admin'|'member'} role - unknown roles are treated as member
   * @returns {object[]}
   */
  function itemsFor(release, role) {
    return (release.items || []).filter(i => i.audience === 'everyone' || (role === 'admin' && i.audience === 'admin'));
  }

  /**
   * forRole — releases with only the notes for this role; releases left
   * with no notes (e.g. admin-only ones, for members) are dropped.
   * @param {'admin'|'member'} role
   * @returns {object[]} oldest first
   */
  function forRole(role) {
    return CHANGELOG
      .map(r => ({ ...r, items: itemsFor(r, role) }))
      .filter(r => r.items.length);
  }

  /**
   * pending — releases this device hasn't seen yet, for its role.
   * @param {'admin'|'member'} role
   * @param {string|null} lastSeenId - newest release id already shown
   *   for this role on this device, or null if never shown
   * @returns {object[]} oldest first; empty when nothing new
   * Edge case: lastSeenId null (new device, new address, first time as
   *   admin) → only the latest release, never the whole history.
   */
  function pending(role, lastSeenId) {
    const mine = forRole(role);
    if (!lastSeenId) {
      const newest = latest();
      return mine.filter(r => newest && r.id === newest.id);
    }
    return mine.filter(r => r.id > lastSeenId);
  }

  /**
   * toText — plain-text/Markdown export (admin "Copy as text").
   * @param {object[]} releases - already filtered/ordered as displayed
   * @param {{technical?: boolean}} [opts] - include versions + details
   * @returns {string}
   */
  function toText(releases, opts = {}) {
    const lines = ['# Dispatch It change log', ''];
    releases.forEach(r => {
      lines.push(`## ${r.date} · ${r.title}${opts.technical && r.versions ? ` (${r.versions})` : ''}`);
      r.items.forEach(i => {
        lines.push(`- [${KINDS[i.kind] || i.kind}${i.audience === 'admin' ? ', admin' : ''}] ${i.text}${opts.technical && i.detail ? ` — ${i.detail}` : ''}`);
      });
      lines.push('');
    });
    return lines.join('\n');
  }

  return { KINDS, all, latest, itemsFor, forRole, pending, toText };
})();

// Node (tests) can require() this file; browsers just get the globals.
if (typeof module !== 'undefined') module.exports = { CHANGELOG, Changelog };
