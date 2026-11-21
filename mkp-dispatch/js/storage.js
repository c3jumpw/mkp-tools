/**
 * =========================================================================
 * storage.js — on-device persistence (localStorage wrapper)
 * =========================================================================
 * PURPOSE
 *   Everything Dispatch It keeps on the phone/browser itself:
 *     - settings       (Worker proxy URL override, default entity)
 *     - draft          (the one in-progress capture, auto-saved while
 *                       typing so closing the app doesn't lose it)
 *     - queue          (captures that failed to send — retried
 *                       automatically)
 *     - recent         (a local log of the last 20 sends — purely a
 *                       record of what THIS device sent, not synced)
 *     - routingStatus  (last /routing/status answer, so Home can decide
 *                       instantly whether smart capture is available)
 *     - catalog        (last /routing/lists answer — every ClickUp list,
 *                       for pickers and "more lists" on the type screen)
 *
 *   IMPORTANT: nothing in this file ever stores a ClickUp API token or
 *   the Gemini key — those live only on the Cloudflare Worker.
 *
 * DATA FLOW
 *   app.js / clickup.js / routing.js read and write through these
 *   functions instead of touching localStorage directly, so the storage
 *   format can change in one place.
 *
 * ASSUMPTIONS / EXTERNAL DEPENDENCIES
 *   - Requires DEFAULT_PROXY_URL (config.js, loaded first).
 *   - localStorage can be unavailable (private browsing) or full. Reads
 *     fall back to defaults; writes are wrapped so a full store degrades
 *     to "not saved" instead of crashing the screen (v4).
 *   - Key prefix stays "dispatch:" after the v4 rename to "Dispatch It",
 *     deliberately: changing it would wipe every device's passcode,
 *     queue and history.
 *
 * -------------------------------------------------------------------------
 * VERSION HISTORY
 *   v1  2026-07-23  Initial implementation. getSettings() defaulted
 *                    proxyUrl to '' — required manual setup.
 *   v2  2026-07-23  getSettings() falls back to DEFAULT_PROXY_URL so the
 *                    app works with zero manual setup.
 *   v3  2026-07-24  Added device passcode storage (getDeviceKey/
 *                    saveDeviceKey/clearDeviceKey) for the lock screen.
 *   v4  2026-10-10  (1) Drafts are now actually used (the v1 TODO): saved
 *                        per route while typing, restored on reopen,
 *                        cleared on send. getDraft(route) only returns a
 *                        draft for the same screen and < 7 days old.
 *                    (2) Added routingStatus + catalog caches for smart
 *                        routing, and patchRecent() so a Recent entry can
 *                        pick up its audit id once the server answers.
 *                    (3) write() no longer throws on a full/blocked store
 *                        (returns false instead) — a quota error used to
 *                        surface as a broken screen mid-send.
 *                    (4) patchQueue() — marks a queued entry "created" as
 *                        soon as ClickUp confirms, before attachments
 *                        upload (prevents a duplicate task on retry).
 *   v5  2026-11-20  Roles + What's new (app.js v16):
 *                    (1) Admin passcode for this device (getAdminKey/
 *                        saveAdminKey/clearAdminKey). Same trust level as
 *                        the device passcode; the Worker enforces it.
 *                    (2) Cached role from /auth/role (getRole/saveRole), so
 *                        screens can decide what to show offline.
 *                    (3) What's-new bookkeeping per role (getWhatsNewSeen/
 *                        markWhatsNewSeen): the newest release id already
 *                        shown on this device. Per role so an admin still
 *                        gets admin notes after first seeing member ones.
 *                    (4) Small view preferences (getPref/savePref), e.g.
 *                        the change log's sort order.
 *                    (5) clearDeviceKey() also forgets the admin passcode
 *                        and role ("Forget passcode" fully locks a device).
 * =========================================================================
 */

const Storage = (() => {
  // Namespaced localStorage keys ("dispatch:" kept on purpose — see header).
  const KEYS = {
    settings: 'dispatch:settings',
    queue: 'dispatch:queue',
    recent: 'dispatch:recent',
    draft: 'dispatch:draft',
    deviceKey: 'dispatch:deviceKey',
    routingStatus: 'dispatch:routingStatus',
    catalog: 'dispatch:catalog',
    // v5 — see VERSION HISTORY
    adminKey: 'dispatch:adminKey',       // string: admin passcode, after the server accepted it
    role: 'dispatch:role',               // {role:'admin'|'member', admin_configured:bool, fetchedAt:ms}
    whatsNewSeen: 'dispatch:whatsNewSeen', // {admin?: releaseId, member?: releaseId}
    prefs: 'dispatch:prefs'              // {changelogOrder?: 'oldest'|'newest', ...}
  };
  // Drafts older than this are ignored (stale context is worse than none).
  const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  /**
   * read
   * Safely reads and JSON-parses a localStorage key.
   * @param {string} key - one of KEYS.*
   * @param {*} fallback - returned if missing or unparseable
   * @returns {*}
   */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  /**
   * write
   * Serializes and writes a value.
   * @param {string} key
   * @param {*} value - JSON-serializable
   * @returns {boolean} false if the browser refused (quota exceeded,
   *   storage disabled) — callers that care (the offline queue) check it.
   */
  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** remove — deletes a key, ignoring storage errors. */
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  // --- Settings -----------------------------------------------------
  /**
   * getSettings
   * Saved settings merged over defaults; proxyUrl defaults to
   * DEFAULT_PROXY_URL unless the user saved an override in Settings.
   * @returns {{proxyUrl: string, defaultEntity: (string|null)}}
   */
  function getSettings() {
    const saved = read(KEYS.settings, {});
    return { proxyUrl: DEFAULT_PROXY_URL, defaultEntity: null, ...saved };
  }

  /** saveSettings — shallow-merges a partial settings object. */
  function saveSettings(settings) {
    write(KEYS.settings, { ...getSettings(), ...settings });
  }

  // --- Draft (the one in-progress capture) ----------------------------
  /**
   * saveDraft
   * @param {string} route - the screen it belongs to, e.g. "/form/mkp/task"
   * @param {object} values - field key → value (callers must leave out
   *   anything sensitive; app.js never drafts Add to Accounts at all)
   */
  function saveDraft(route, values) {
    write(KEYS.draft, { route, values, savedAt: Date.now() });
  }
  /**
   * getDraft
   * @param {string} route
   * @returns {object|null} values for that route, or null if none/stale
   */
  function getDraft(route) {
    const d = read(KEYS.draft, null);
    if (!d || d.route !== route || !d.values) return null;
    if (Date.now() - (d.savedAt || 0) > DRAFT_MAX_AGE_MS) return null;
    return d.values;
  }
  /** clearDraft — forget the draft (after send, or "Discard"). */
  function clearDraft() {
    remove(KEYS.draft);
  }

  // --- Offline queue ------------------------------------------------
  /** getQueue - returns the array of not-yet-sent capture entries. */
  function getQueue() {
    return read(KEYS.queue, []);
  }
  /**
   * enqueue - appends one capture entry to the retry queue.
   * @returns {boolean} false if the device refused to store it (usually a
   *   large attachment over the browser's ~5–10MB localStorage budget)
   */
  function enqueue(entry) {
    const queue = getQueue();
    queue.push(entry);
    return write(KEYS.queue, queue);
  }
  /**
   * patchQueue
   * Merges fields into a queued entry by id — used to record "the task
   * was created" the moment it happens, so if the app closes during a
   * long attachment upload the retry doesn't create the task again.
   * @param {string} id
   * @param {object} patch
   */
  function patchQueue(id, patch) {
    const queue = getQueue();
    const i = queue.findIndex(e => e.id === id);
    if (i === -1) return;
    queue[i] = { ...queue[i], ...patch };
    write(KEYS.queue, queue);
  }
  /** removeFromQueue - drops an entry (by id) once it sends or is rejected. */
  function removeFromQueue(id) {
    write(KEYS.queue, getQueue().filter(e => e.id !== id));
  }

  // --- Recent captures (local log, last 20) ---------------------------
  /** getRecent - returns the locally-logged recent sends (device-only). */
  function getRecent() {
    return read(KEYS.recent, []);
  }
  /** addRecent - prepends an entry, capped at 20. */
  function addRecent(entry) {
    write(KEYS.recent, [entry, ...getRecent()].slice(0, 20));
  }
  /**
   * patchRecent
   * Merges fields into an existing Recent entry by id — used when the
   * audit id or an undo result arrives after the entry was logged.
   * @param {string} id
   * @param {object} patch
   */
  function patchRecent(id, patch) {
    const recent = getRecent();
    const i = recent.findIndex(r => r.id === id);
    if (i === -1) return;
    recent[i] = { ...recent[i], ...patch };
    write(KEYS.recent, recent);
  }

  // --- Device passcode ----------------------------------------------
  // Plain text in localStorage: a low-friction gate, not bank-grade
  // security. The real enforcement is server-side (Worker checkPasscode).
  /** getDeviceKey - returns the passcode saved on this device, or null. */
  function getDeviceKey() {
    return read(KEYS.deviceKey, null);
  }
  /** saveDeviceKey - remembers a passcode after it's been verified. */
  function saveDeviceKey(key) {
    write(KEYS.deviceKey, key);
  }
  /**
   * clearDeviceKey - forgets the passcode (e.g. after a 403, or "Forget
   * passcode on this device"). v5: also forgets admin access and the
   * cached role, so a locked device can't keep showing admin pages.
   */
  function clearDeviceKey() {
    remove(KEYS.deviceKey);
    remove(KEYS.adminKey);
    remove(KEYS.role);
  }

  // --- Admin access (v5) ----------------------------------------------
  /** getAdminKey - the admin passcode saved on this device, or null. */
  function getAdminKey() {
    return read(KEYS.adminKey, null);
  }
  /** saveAdminKey - remembers the admin passcode after /auth/role accepted it. */
  function saveAdminKey(key) {
    write(KEYS.adminKey, key);
  }
  /** clearAdminKey - "Lock admin on this device", or the server rejected it. */
  function clearAdminKey() {
    remove(KEYS.adminKey);
  }
  /**
   * getRole - last known role for this device.
   * @returns {{role: 'admin'|'member', admin_configured: boolean, fetchedAt: number}|null}
   */
  function getRole() {
    return read(KEYS.role, null);
  }
  /** saveRole - caches a /auth/role answer with the time it was fetched. */
  function saveRole(info) {
    write(KEYS.role, { role: info.role === 'admin' ? 'admin' : 'member', admin_configured: Boolean(info.admin_configured), fetchedAt: Date.now() });
  }

  // --- What's new (v5) --------------------------------------------------
  /**
   * getWhatsNewSeen - newest release id already shown to this role here.
   * @param {'admin'|'member'} role
   * @returns {string|null} null if this device never showed What's new for
   *   that role (Changelog.pending then shows only the latest release)
   */
  function getWhatsNewSeen(role) {
    return read(KEYS.whatsNewSeen, {})[role] || null;
  }
  /** markWhatsNewSeen - records that release `id` (and older) was shown. */
  function markWhatsNewSeen(role, id) {
    const seen = read(KEYS.whatsNewSeen, {});
    if (!seen[role] || id > seen[role]) seen[role] = id;
    write(KEYS.whatsNewSeen, seen);
  }

  // --- View preferences (v5) ---------------------------------------------
  /** getPref - one small per-device preference, or `fallback`. */
  function getPref(name, fallback) {
    const prefs = read(KEYS.prefs, {});
    return prefs[name] !== undefined ? prefs[name] : fallback;
  }
  /** savePref - stores one small per-device preference. */
  function savePref(name, value) {
    write(KEYS.prefs, { ...read(KEYS.prefs, {}), [name]: value });
  }

  // --- Smart-routing caches ------------------------------------------
  /**
   * getRoutingStatus
   * @returns {object|null} last /routing/status payload plus `fetchedAt`
   */
  function getRoutingStatus() {
    return read(KEYS.routingStatus, null);
  }
  /** saveRoutingStatus - caches a /routing/status payload. */
  function saveRoutingStatus(status) {
    write(KEYS.routingStatus, { ...status, fetchedAt: Date.now() });
  }
  /**
   * getCatalog
   * @returns {{lists: Array<{id, name, path, space_id, space}>, synced_at: number|null, fetchedAt: number}|null}
   */
  function getCatalog() {
    return read(KEYS.catalog, null);
  }
  /** saveCatalog - caches a /routing/lists payload. */
  function saveCatalog(catalog) {
    write(KEYS.catalog, { ...catalog, fetchedAt: Date.now() });
  }

  return {
    getSettings, saveSettings,
    saveDraft, getDraft, clearDraft,
    getQueue, enqueue, patchQueue, removeFromQueue,
    getRecent, addRecent, patchRecent,
    getDeviceKey, saveDeviceKey, clearDeviceKey,
    getAdminKey, saveAdminKey, clearAdminKey, getRole, saveRole,
    getWhatsNewSeen, markWhatsNewSeen, getPref, savePref,
    getRoutingStatus, saveRoutingStatus, getCatalog, saveCatalog
  };
})();
