/**
 * =========================================================================
 * routing.js — client for the Worker's smart-routing API
 * =========================================================================
 * PURPOSE
 *   Thin, documented wrappers around the Worker v8 routes, plus the one
 *   piece of routing work the DEVICE does itself: the initial task-index
 *   backfill (buildTaskIndex). Keeps app.js free of URL strings and
 *   request shapes.
 *
 * DATA FLOW
 *   app.js → Routing.* → ClickUp.request() (passcode header, timeouts,
 *   error classification) → Worker → Gemini / ClickUp / KV / Vectorize.
 *
 * ASSUMPTIONS / EXTERNAL DEPENDENCIES
 *   - Loaded after config.js, storage.js and clickup.js (index.html).
 *   - Every function can throw the error shapes documented in clickup.js.
 *   - Nothing from "Add to Accounts" is ever passed to these functions —
 *     app.js keeps credentials out of the smart-routing path entirely.
 *
 * -------------------------------------------------------------------------
 * VERSION HISTORY
 *   v1  2026-10-10  Initial version for smart routing (syncNow paced to
 *                    ≥1.2s/step after review — KV's 1 write/sec/key limit).
 *   v2  2026-11-20  Roles (Worker v9): role(), cachedRole(), isAdmin(),
 *                    tryAdminCode(), lockAdmin(). role() rejects replies
 *                    that aren't a role (BAD_ROLE_RESPONSE) instead of
 *                    caching them. Review fixes: a reply that arrives
 *                    after the admin code changed (Lock admin tapped
 *                    meanwhile) is ignored; a rotated admin passcode shows
 *                    a message; confirmConnection() for new ClickUp
 *                    connections (POST /oauth/confirm).
 * =========================================================================
 */

const Routing = (() => {
  // How long a cached /routing/status is trusted before Home refreshes
  // it in the background (the cache itself is used instantly either way).
  const STATUS_TTL_MS = 10 * 60 * 1000;
  // Items per /routing/index-tasks call during backfill. Small on
  // purpose: keeps the Worker's embedding response tiny enough for the
  // free plan's 10ms CPU budget (see worker/lib/workspace-index.js).
  const BACKFILL_CHUNK = 25;

  /**
   * nowContext
   * The owner's local date context, so "by Friday" resolves against
   * THEIR Friday, not the Worker's UTC clock.
   * @returns {{today: string, weekday: string, tz: string}}
   */
  function nowContext() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return {
      today: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
      tz: (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC'
    };
  }

  /**
   * status
   * Fetches /routing/status and caches it (Storage.saveRoutingStatus).
   * @returns {Promise<object>}
   */
  async function status() {
    const s = await ClickUp.request('/routing/status', { timeoutMs: 15000 });
    Storage.saveRoutingStatus(s);
    return s;
  }

  /**
   * cachedStatus — last known status without a network call.
   * @returns {object|null}
   */
  function cachedStatus() {
    return Storage.getRoutingStatus();
  }

  /**
   * isAvailable
   * Smart capture is offered only when the server says Gemini is set up
   * and ClickUp is connected. Based on the cached status so Home renders
   * instantly; refreshStatusIfStale() keeps it current.
   * @returns {boolean}
   */
  function isAvailable() {
    const s = cachedStatus();
    return Boolean(s && s.clickup_connected && s.gemini && s.gemini.configured);
  }

  /**
   * canCheckDuplicates — vectors + Gemini available (manual-send check).
   * @returns {boolean}
   */
  function canCheckDuplicates() {
    const s = cachedStatus();
    return Boolean(isAvailable() && s.vectors && s.vectors.available && s.sync && s.sync.tasks_indexed_through);
  }

  /**
   * refreshStatusIfStale
   * Background refresh of status + list catalog when older than
   * STATUS_TTL_MS. Never throws (offline is normal for a capture app).
   * @param {Function} [onUpdate] - called with the fresh status
   */
  async function refreshStatusIfStale(onUpdate) {
    const s = cachedStatus();
    if (s && Date.now() - (s.fetchedAt || 0) < STATUS_TTL_MS) return;
    try {
      const fresh = await status();
      if (fresh.index) await lists().catch(() => {});
      if (onUpdate) onUpdate(fresh);
    } catch (e) { /* keep the cached copy */ }
  }

  /**
   * lists
   * Every non-private ClickUp list from the Worker's index; cached for
   * the list picker and the type screen's "more lists" section.
   * @returns {Promise<{lists: object[], synced_at: number|null}>}
   */
  async function lists() {
    const data = await ClickUp.request('/routing/lists', { timeoutMs: 15000 });
    Storage.saveCatalog(data);
    return data;
  }

  /**
   * suggest
   * Asks the Worker where a capture should go.
   * @param {object} capture - { text, title?, hint?, attachments? }
   * @returns {Promise<object>} the suggestion (see worker
   *   lib/routing-engine.js calibrate() for every field)
   */
  async function suggest(capture) {
    const data = await ClickUp.request('/route/suggest', {
      method: 'POST',
      timeoutMs: 35000,
      json: {
        ...capture,
        ...nowContext(),
        known: getRoutableDestinations().map(({ list_id, label, entity }) => ({ list_id, label, entity })),
        exclude: ROUTING_EXCLUDED_LIST_IDS
      }
    });
    return data.suggestion;
  }

  /**
   * commit
   * Performs the decided action (create task / add update comment) via
   * the Worker, which also writes the audit record and feedback.
   * @param {object} body - see worker routing-engine.js commitCapture()
   * @returns {Promise<{audit_id: string, task: object, comment_id?: string, list_path?: string}>}
   */
  function commit(body) {
    return ClickUp.request('/route/commit', { method: 'POST', json: body, timeoutMs: 40000 });
  }

  /**
   * duplicates
   * Quick vector-only duplicate check for manual sends.
   * @param {string} title
   * @param {string} text
   * @returns {Promise<{available: boolean, matches: object[]}>}
   */
  function duplicates(title, text) {
    return ClickUp.request('/route/duplicates', { method: 'POST', json: { title, text }, timeoutMs: 6000 });
  }

  /**
   * record
   * Logs a manual send to the shared Activity history (best-effort).
   * @param {object} body - see worker routing-engine.js recordManual()
   * @returns {Promise<{audit_id: string}>}
   */
  function record(body) {
    return ClickUp.request('/audit/record', { method: 'POST', json: body, timeoutMs: 15000 });
  }

  /**
   * activity — one page of the audit log, newest first.
   * @param {string} [cursor]
   * @returns {Promise<{items: object[], cursor: string|null}>}
   */
  function activity(cursor) {
    return ClickUp.request(`/audit?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { timeoutMs: 15000 });
  }

  /**
   * undo — reverses one audited action.
   * @param {string} auditId
   * @returns {Promise<{ok: boolean, record: object, notes: string[]}>}
   */
  function undo(auditId) {
    return ClickUp.request(`/audit/${auditId}/undo`, { method: 'POST', json: {}, timeoutMs: 30000 });
  }

  /** saveSettings — updates the shared routing thresholds. */
  function saveSettings(patch) {
    return ClickUp.request('/routing/settings', { method: 'POST', json: patch, timeoutMs: 15000 });
  }

  /** syncStep — one Worker sync step ({phase, more, ...}). */
  function syncStep(mode = 'auto') {
    return ClickUp.request('/routing/sync', { method: 'POST', json: { mode }, timeoutMs: 45000 });
  }

  /** setWebhook — 'enable' | 'disable' live updates from ClickUp. */
  function setWebhook(action) {
    return ClickUp.request('/routing/webhook', { method: 'POST', json: { action }, timeoutMs: 30000 });
  }

  /**
   * syncNow
   * Runs Worker sync steps until there's nothing left (or 60 steps, a
   * safety stop), reporting progress after each.
   * @param {Function} onProgress - called with each step's result
   * @returns {Promise<number>} steps run
   */
  async function syncNow(onProgress) {
    let steps = 0;
    for (; steps < 60; steps++) {
      const started = Date.now();
      const r = await syncStep('auto');
      if (onProgress) onProgress(r);
      if (!r.more) { steps++; break; }
      // Keep ≥1.2s between steps: each step rewrites the same KV keys,
      // and Cloudflare KV allows one write per second per key.
      const wait = 1200 - (Date.now() - started);
      if (wait > 0) await new Promise(res => setTimeout(res, wait));
    }
    return steps;
  }

  /**
   * toIndexItem
   * Device-side twin of the Worker's taskToItem(): reduces a full
   * ClickUp task to what the vector index needs. Keep the two in sync.
   * @param {object} task - ClickUp task
   * @returns {object}
   */
  function toIndexItem(task) {
    const status = task.status || {};
    const desc = String(task.text_content || task.description || '').replace(/\s+/g, ' ').trim();
    return {
      id: String(task.id),
      name: String(task.name || ''),
      text: desc.slice(0, 400),
      list_id: String((task.list && task.list.id) || ''),
      space_id: String((task.space && task.space.id) || ''),
      status: String(status.status || ''),
      closed: status.type === 'closed' || status.type === 'done' || Boolean(task.archived),
      parent: Boolean(task.parent)
    };
  }

  /**
   * buildTaskIndex
   * The initial backfill: pages through every OPEN task in the workspace
   * (via the proxy — the Worker streams pages without parsing them) and
   * posts compact items to the Worker for embedding, 25 at a time.
   * Retries a chunk up to 3 times when Gemini rate-limits (429), waiting
   * 20s between tries, so a big workspace on a free Gemini key still
   * finishes — just more slowly.
   * @param {Function} onProgress - ({page, indexed, waiting?}) => void
   * @param {{cancelled: boolean}} [token] - set .cancelled to stop early
   * @returns {Promise<{indexed: number, pages: number, cancelled: boolean}>}
   * @throws the first non-rate-limit error (progress so far is kept —
   *   vectors already upserted stay; re-running simply re-embeds)
   */
  async function buildTaskIndex(onProgress, token = { cancelled: false }) {
    const startedAt = Date.now();
    let page = 0;
    let indexed = 0;
    for (;;) {
      if (token.cancelled) return { indexed, pages: page, cancelled: true };
      const data = await ClickUp.getTeamTasksPage(page);
      const tasks = (data && data.tasks) || [];
      const items = tasks.map(toIndexItem).filter(i => !ROUTING_EXCLUDED_LIST_IDS.includes(i.list_id));
      for (let i = 0; i < items.length; i += BACKFILL_CHUNK) {
        if (token.cancelled) return { indexed, pages: page, cancelled: true };
        const chunk = items.slice(i, i + BACKFILL_CHUNK);
        for (let attempt = 1; ; attempt++) {
          try {
            await ClickUp.request('/routing/index-tasks', { method: 'POST', json: { items: chunk }, timeoutMs: 45000 });
            break;
          } catch (err) {
            if (err.status === 429 && attempt < 4) {
              if (onProgress) onProgress({ page, indexed, waiting: true });
              await new Promise(r => setTimeout(r, 20000));
              continue;
            }
            throw err;
          }
        }
        indexed += chunk.length;
        if (onProgress) onProgress({ page, indexed });
      }
      const last = tasks.length < 100 || data.last_page === true;
      if (last) break;
      page++;
    }
    // Tell the Worker the backfill is complete; it sets the incremental
    // sync's starting point to when this backfill BEGAN.
    await ClickUp.request('/routing/index-tasks', { method: 'POST', json: { items: [], finish: { started_at: startedAt, total: indexed } }, timeoutMs: 15000 });
    return { indexed, pages: page + 1, cancelled: false };
  }

  // ---------------------------------------------------------------
  // Roles (v2)
  // ---------------------------------------------------------------
  /**
   * role
   * Asks the Worker which role this device has (GET /auth/role) and
   * caches it. If the server rejected a saved admin passcode (changed or
   * rotated), the saved one is forgotten here.
   * @returns {Promise<{role: 'admin'|'member', admin_configured: boolean, admin_rejected: boolean}>}
   * @throws request errors (offline, wrong team passcode), or
   *   BAD_ROLE_RESPONSE when the reply isn't a role (e.g. an older Worker
   *   or a proxy page) — callers fall back to cachedRole(). Rejecting it
   *   here matters: screens compare roles and redraw on a change, and an
   *   unexpected shape used to look like a change every time (found in
   *   v16 testing: Settings redrew itself in a loop).
   */
  async function role() {
    // The admin code this question is about. If it changes before the
    // answer arrives (Lock admin / Unlock tapped meanwhile), the answer is
    // about a different device state and must not be saved over it.
    const sentKey = Storage.getAdminKey();
    const info = await ClickUp.request('/auth/role', { timeoutMs: 10000 });
    if (!info || (info.role !== 'admin' && info.role !== 'member')) {
      const err = new Error('BAD_ROLE_RESPONSE');
      err.badResponse = true;
      throw err;
    }
    if (Storage.getAdminKey() !== sentKey) {
      const current = cachedRole();
      return { role: current.role, admin_configured: current.admin_configured, admin_rejected: false, stale: true };
    }
    if (info.admin_rejected) {
      Storage.clearAdminKey();
      UI.toast('The admin passcode was changed. Unlock admin again in Settings → Admin.', { duration: 8000 });
    }
    Storage.saveRole(info);
    return info;
  }

  /**
   * confirmConnection
   * Makes a just-approved ClickUp connection live (Worker v9 parks it until
   * an admin confirms). Admin devices call this when Settings opens with
   * ?connected=pending.
   * @returns {Promise<{ok: true}>}
   * @throws 403 admin_required (not admin), 404 (nothing waiting / expired)
   */
  function confirmConnection() {
    return ClickUp.request('/oauth/confirm', { method: 'POST', json: {}, timeoutMs: 15000 });
  }

  /**
   * cachedRole — last known role without a network call.
   * @returns {{role: 'admin'|'member', admin_configured: boolean, fetchedAt: number}}
   *   member + configured when never fetched (safest default)
   */
  function cachedRole() {
    return Storage.getRole() || { role: 'member', admin_configured: true, fetchedAt: 0 };
  }

  /** isAdmin — cached role is admin (screens use this to show controls). */
  function isAdmin() {
    return cachedRole().role === 'admin';
  }

  /**
   * tryAdminCode
   * Checks a candidate admin passcode with the server and keeps it only
   * if accepted.
   * @param {string} code
   * @returns {Promise<boolean>} true when this device is now admin
   * @throws request errors (offline etc.) — the candidate is not kept
   */
  async function tryAdminCode(code) {
    const previous = Storage.getAdminKey();
    Storage.saveAdminKey(code);
    try {
      const info = await ClickUp.request('/auth/role', { timeoutMs: 10000 });
      Storage.saveRole(info || {});
      if (info && info.role === 'admin' && info.admin_configured) return true;
      // Wrong code: put back whatever was there before (normally nothing).
      if (previous) Storage.saveAdminKey(previous); else Storage.clearAdminKey();
      return false;
    } catch (err) {
      if (previous) Storage.saveAdminKey(previous); else Storage.clearAdminKey();
      throw err;
    }
  }

  /**
   * lockAdmin — removes admin access from this device. The cached role
   * drops to member right away; the next role() call confirms it.
   */
  function lockAdmin() {
    Storage.clearAdminKey();
    const r = Storage.getRole();
    Storage.saveRole({ role: 'member', admin_configured: r ? r.admin_configured : true });
  }

  return {
    role, cachedRole, isAdmin, tryAdminCode, lockAdmin, confirmConnection,
    nowContext, status, cachedStatus, isAvailable, canCheckDuplicates, refreshStatusIfStale,
    lists, suggest, commit, duplicates, record, activity, undo,
    saveSettings, syncStep, syncNow, setWebhook, toIndexItem, buildTaskIndex
  };
})();
