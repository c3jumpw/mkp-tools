/**
 * =========================================================================
 * lib/migrate.js — one-time history copy between two Dispatch Workers
 * =========================================================================
 * PURPOSE
 *   Cloudflare can't move a Worker (or its KV data) between accounts. When
 *   the server moved from the c1.jumpw Cloudflare account to c3.jumpw
 *   (2026-11-22), this module copied the history that would otherwise be
 *   lost: routing settings, learned corrections/accuracy (feedback), the
 *   workspace index, and every Activity (audit) record with its listing
 *   metadata and original expiry.
 *
 * RESPONSIBILITIES / DATA FLOW
 *   Admin device → NEW Worker  POST /admin/import-from {cursor?}
 *     NEW Worker → OLD Worker  GET  /admin/export?cursor=…   (server-to-
 *       server; the caller's X-Dispatch-Key / X-Dispatch-Admin headers are
 *       forwarded, so both Workers must use the same two passcodes)
 *     NEW Worker writes the page into its own KV and returns
 *       {written, skipped, cursor, done}; the device repeats with the
 *       returned cursor until done.
 *   The data never passes through the browser, and nothing secret is
 *   exported (see NEVER_EXPORTED).
 *
 * PAGES
 *   Page 1 (no cursor): the three single keys (settings, feedback, index).
 *   Later pages: up to PAGE_SIZE audit records each, oldest KV order.
 *   Splitting this way keeps each invocation well inside the free plan's
 *   10ms CPU / 1,000 KV operations per request.
 *
 * ASSUMPTIONS / DEPENDENCIES
 *   - env.TOKEN_STORE (KV) on both Workers; key layout in lib/store.js.
 *   - env.MIGRATE_FROM (var, NEW Worker only): the one source URL that
 *     import-from may contact. Unset → import-from is disabled, so this
 *     can't be turned into an open fetch proxy.
 *   - Free plan: 1,000 KV writes per day per account. Each imported record
 *     is one write. If the limit is hit, the import stops with a clear
 *     message and the same cursor can be run again the next day.
 *
 * -------------------------------------------------------------------------
 * VERSION HISTORY
 *   v1  2026-11-22  Created for the move to the c3.jumpw Cloudflare account
 *                    (clickup-proxy.js v10).
 *                    TODO: delete this module, its two routes and
 *                    MIGRATE_FROM once the copy is done and the old c1
 *                    Worker is gone. Safe to keep until then: both routes
 *                    are admin-only and import-from only talks to
 *                    MIGRATE_FROM.
 * =========================================================================
 */

import { fetchWithTimeout } from './http.js';
import { KEYS } from './store.js';
import { statusError } from './audit-log.js';

// Single keys copied on the first page. Values are copied as raw strings
// (no parse/re-serialize) to keep CPU low for the large workspace index.
export const SINGLE_KEYS = [KEYS.settings, KEYS.feedback, KEYS.index];

// Keys that must never leave a Worker: the ClickUp OAuth token (live and
// pending), the webhook record (holds its signing secret and the OLD
// Worker's URL), and sync bookkeeping (cursors that belong to the old
// index run; the new Worker starts its own). Listed so the filter below
// is explicit and testable.
export const NEVER_EXPORTED = new Set([KEYS.token, 'access_token_pending', KEYS.webhook, KEYS.sync]);

// Audit records per page. ~100 KV reads (export) or writes (import) per
// invocation: far under the 1,000-operation limit, and small enough that
// a daily-limit stop wastes little.
export const PAGE_SIZE = 100;

// Marks the response shape so the importer can refuse anything else.
const FORMAT = 'dispatch-history/1';

/**
 * isImportable
 * Which keys import may write. Mirrors what export sends; anything else in
 * a response (a newer format, a mistake) is skipped rather than written.
 * @param {string} key
 * @returns {boolean}
 */
export function isImportable(key) {
  if (typeof key !== 'string' || NEVER_EXPORTED.has(key)) return false;
  return SINGLE_KEYS.includes(key) || key.startsWith(KEYS.auditPrefix);
}

/**
 * exportPage — GET /admin/export (runs on the OLD Worker).
 * @param {object} env
 * @param {string|null} cursor - null/'' for the first page; then the
 *   `cursor` value from the previous page ('audit' = first audit page)
 * @returns {Promise<{format: string, items: object[], cursor: string|null, done: boolean}>}
 *   items: {key, value (raw string), metadata?, expiration? (unix s)}
 */
export async function exportPage(env, cursor) {
  // First page: the single keys only.
  if (!cursor) {
    const items = [];
    for (const key of SINGLE_KEYS) {
      const value = await env.TOKEN_STORE.get(key);
      if (value !== null) items.push({ key, value });
    }
    return { format: FORMAT, items, cursor: 'audit', done: false };
  }

  // Audit pages. 'audit' means "start of the audit keys"; anything else is
  // KV's own list cursor from the previous page.
  const res = await env.TOKEN_STORE.list({
    prefix: KEYS.auditPrefix,
    limit: PAGE_SIZE,
    cursor: cursor === 'audit' ? undefined : cursor
  });
  const items = [];
  for (const k of res.keys) {
    const value = await env.TOKEN_STORE.get(k.name);
    if (value === null) continue; // expired between list and get
    items.push({ key: k.name, value, metadata: k.metadata || null, expiration: k.expiration || null });
  }
  const done = Boolean(res.list_complete);
  return { format: FORMAT, items, cursor: done ? null : res.cursor, done };
}

/**
 * normalizeOrigin — "https://x.workers.dev/" → "https://x.workers.dev".
 * @param {string} s
 * @returns {string}
 */
function normalizeOrigin(s) {
  return String(s || '').trim().replace(/\/+$/, '');
}

/**
 * importFrom — POST /admin/import-from (runs on the NEW Worker).
 * Pulls ONE export page from env.MIGRATE_FROM and writes it.
 * @param {object} env
 * @param {Request} request - its passcode headers are forwarded
 * @param {object} body - {cursor?: string}
 * @returns {Promise<{written: number, skipped: number, cursor: string|null, done: boolean, source: string}>}
 * @throws statusError 409 (not configured), 502 (old server unreachable or
 *   answered badly), 403 (old server rejected the passcodes), 429 (daily
 *   KV write limit; `cursor` in the message lets you resume)
 * Edge cases: records that expire within 2 minutes are skipped (KV
 *   rejects expirations under 60s from now). Re-running a page is safe:
 *   the same keys are overwritten with the same values.
 */
export async function importFrom(env, request, body) {
  const source = normalizeOrigin(env.MIGRATE_FROM);
  if (!source) throw statusError(409, 'History import is not set up on this server (MIGRATE_FROM is empty).');

  const cursor = typeof body.cursor === 'string' && body.cursor ? body.cursor : '';
  const url = `${source}/admin/export${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`;
  const headers = {
    'X-Dispatch-Key': request.headers.get('X-Dispatch-Key') || '',
    'X-Dispatch-Admin': request.headers.get('X-Dispatch-Admin') || ''
  };

  let res;
  try {
    res = await fetchWithTimeout(url, { headers }, 20000);
  } catch (err) {
    throw statusError(502, `Couldn’t reach the old server (${source}).`);
  }
  if (res.status === 403) {
    throw statusError(403, 'The old server rejected the passcodes. Both servers need the same team and admin passcodes while copying.');
  }
  if (!res.ok) throw statusError(502, `The old server answered ${res.status}. Is it updated to server v10?`);

  let page;
  try { page = await res.json(); } catch (e) { page = null; }
  if (!page || page.format !== FORMAT || !Array.isArray(page.items)) {
    throw statusError(502, 'The old server sent something that isn’t a history export.');
  }

  let written = 0;
  let skipped = 0;
  const soon = Math.floor(Date.now() / 1000) + 120;
  for (const item of page.items) {
    if (!isImportable(item && item.key) || typeof item.value !== 'string') { skipped++; continue; }
    const opts = {};
    if (item.metadata) opts.metadata = item.metadata;
    if (item.expiration) {
      if (item.expiration < soon) { skipped++; continue; }
      opts.expiration = item.expiration;
    }
    try {
      await env.TOKEN_STORE.put(item.key, item.value, opts);
    } catch (err) {
      // Most likely the free plan's 1,000 writes/day. Resume from the
      // cursor THIS page started at (re-writing a page is harmless).
      throw statusError(429, `Stopped after ${written} records: Cloudflare refused a write (${String(err && err.message || err).slice(0, 80)}). Run the copy again later with cursor "${cursor}".`);
    }
    written++;
  }
  return { written, skipped, cursor: page.cursor || null, done: Boolean(page.done), source };
}
