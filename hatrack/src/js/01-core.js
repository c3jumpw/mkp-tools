'use strict';
/* ============ HatRack — core: utilities, data model, persistence ============ */

const LS_KEY = 'hatrack.data.v1';
const LS_UI = 'hatrack.ui.v1';
const APP_VERSION = '1.0.0';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = '') => p + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 8);
const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
const clone = o => JSON.parse(JSON.stringify(o));
const now = () => Date.now();
const pluralize = w => /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : /(s|x|z|ch|sh)$/i.test(w) ? w + 'es' : w + 's';
const aAn = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
const plural = (n, w, p) => `${n} ${n === 1 ? w : (p || pluralize(w))}`;
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PALETTE = ['#1E6B52', '#2F5D9E', '#8A3FA0', '#B4532A', '#A87A12', '#0E7C86', '#A23B5A', '#5A6B2E', '#C2410C', '#4F46E5', '#64748B', '#7C5C3B'];

/* ---------- dates ---------- */
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayStr = () => ymd(new Date());
function parseYMD(s) { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function addDays(s, n) { const d = parseYMD(s); d.setDate(d.getDate() + n); return ymd(d); }
function addMonths(s, n) {
  const d = parseYMD(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return ymd(d);
}
const dayDiff = (a, b) => Math.round((parseYMD(a) - parseYMD(b)) / 864e5);
function fmtDate(s) {
  const d = parseYMD(s); if (!d) return '';
  const td = todayStr(); const diff = dayDiff(s, td);
  if (diff === 0) return 'Today'; if (diff === 1) return 'Tomorrow'; if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  const o = { month: 'short', day: 'numeric' }; if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return d.toLocaleDateString(undefined, o);
}
const WD_FULL = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function nextWeekdayOnOrAfter(from, wd) { const d = parseYMD(from); const diff = (wd - d.getDay() + 7) % 7; return addDays(from, diff); }
function endOfWeek(td) { return nextWeekdayOnOrAfter(td, 0); } // upcoming Sunday (today if Sunday)
function parseDue(raw) {
  if (raw == null) return null;
  let s = String(raw).trim().toLowerCase().replace(/[ t]\d{1,2}:\d{2}.*$/, '').replace(/\s+/g, ' ');
  if (!s) return null;
  const td = todayStr(); let m;
  if (['today', 'tod', 'now', 'tdy'].includes(s)) return td;
  if (['tomorrow', 'tmr', 'tom', 'tmrw', 'tomorow'].includes(s)) return addDays(td, 1);
  if (s === 'yesterday') return addDays(td, -1);
  if ((m = /^\+(\d+)\s*(d|days?|w|wks?|weeks?|m|mos?|months?|y|yrs?|years?)?$/.exec(s))) {
    const n = +m[1], u = (m[2] || 'd')[0];
    return u === 'd' ? addDays(td, n) : u === 'w' ? addDays(td, 7 * n) : u === 'm' ? addMonths(td, n) : addMonths(td, 12 * n);
  }
  if (s === 'eow') return nextWeekdayOnOrAfter(td, 5);
  if (s === 'eom') { const d = parseYMD(td); return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
  if (s === 'nextweek' || s === 'next week') return addDays(endOfWeek(td), 1);
  if (/^[a-z]{3,9}$/.test(s)) { const wi = WD_FULL.findIndex(w => w.startsWith(s)); if (wi >= 0) return nextWeekdayOnOrAfter(td, wi); }
  if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s))) return valid(+m[1], +m[2], +m[3]);
  if ((m = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(s))) {
    let y = m[3] ? +m[3] : null; if (y != null && y < 100) y += 2000;
    let r = valid(y ?? new Date().getFullYear(), +m[1], +m[2]);
    if (r && y == null && r < td) r = valid(new Date().getFullYear() + 1, +m[1], +m[2]);
    return r;
  }
  if ((m = /^([a-z]{3,9})\.?[\s-]?(\d{1,2})(?:st|nd|rd|th)?(?:,?[\s-]+(\d{4}))?$/.exec(s))) return monthDay(m[1], +m[2], m[3]);
  if ((m = /^(\d{1,2})(?:st|nd|rd|th)?[\s-]?([a-z]{3,9})\.?(?:,?[\s-]+(\d{4}))?$/.exec(s))) return monthDay(m[2], +m[1], m[3]);
  return null;
  function valid(y, mo, d) { if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; const dt = new Date(y, mo - 1, d); return dt.getMonth() === mo - 1 ? ymd(dt) : null; }
  function monthDay(mn, d, y) {
    const mi = MONTHS.indexOf(mn.slice(0, 3)); if (mi < 0) return null;
    let r = valid(y ? +y : new Date().getFullYear(), mi + 1, d);
    if (r && !y && r < td) r = valid(new Date().getFullYear() + 1, mi + 1, d);
    return r;
  }
}

/* ---------- durations ---------- */
function parseDuration(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, '');
  if (!s || s === 'none') return null;
  let m;
  if ((m = /^(\d+):(\d{2})$/.exec(s))) return +m[1] * 60 + +m[2];
  if ((m = /^(\d+(?:\.\d+)?)$/.exec(s))) return Math.round(+m[1]);
  const re = /(\d+(?:\.\d+)?)(days?|d|hours?|hrs?|h|minutes?|mins?|m)/g;
  let total = 0, used = 0;
  while ((m = re.exec(s))) { const n = +m[1], u = m[2][0]; total += u === 'd' ? n * 480 : u === 'h' ? n * 60 : n; used += m[0].length; }
  return used && used === s.length ? Math.round(total) : null;
}
function fmtDur(m) {
  if (m == null || m === '' || isNaN(m)) return '';
  m = +m; if (m < 60) return m + 'm';
  const h = Math.floor(m / 60), r = m % 60; return r ? `${h}h ${r}m` : `${h}h`;
}
function fmtHours(min) { if (!min) return '0h'; const h = min / 60; return (h < 10 ? Math.round(h * 10) / 10 : Math.round(h)) + 'h'; }

/* ---------- repeats ---------- */
const REPEATS = [['', 'Does not repeat'], ['daily', 'Every day'], ['weekdays', 'Every weekday'], ['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month'], ['quarterly', 'Every 3 months'], ['yearly', 'Every year']];
const REPEAT_LABEL = Object.fromEntries(REPEATS);
const REPEAT_ALIAS = { daily: 'daily', everyday: 'daily', day: 'daily', weekdays: 'weekdays', weekday: 'weekdays', weekly: 'weekly', week: 'weekly', biweekly: 'biweekly', fortnightly: 'biweekly', monthly: 'monthly', month: 'monthly', quarterly: 'quarterly', quarter: 'quarterly', yearly: 'yearly', annually: 'yearly', annual: 'yearly', year: 'yearly' };
function nextDue(due, rep) {
  switch (rep) {
    case 'daily': return addDays(due, 1);
    case 'weekdays': { let d = addDays(due, 1); while ([0, 6].includes(parseYMD(d).getDay())) d = addDays(d, 1); return d; }
    case 'weekly': return addDays(due, 7);
    case 'biweekly': return addDays(due, 14);
    case 'monthly': return addMonths(due, 1);
    case 'quarterly': return addMonths(due, 3);
    case 'yearly': return addMonths(due, 12);
  }
  return due;
}

/* ---------- default data ---------- */
function defaultData() {
  return {
    app: 'HatRack', version: 1,
    levelNames: ['Parent', 'Entity', 'Sub-branch'],
    areas: [],
    types: [
      { id: 'ty_task', name: 'Task', icon: '', color: '#2F5D9E', keywords: '' },
      { id: 'ty_rem', name: 'Reminder', icon: '⏰', color: '#B4532A', keywords: 'remind, reminder, don\'t forget, dont forget' },
      { id: 'ty_idea', name: 'Idea', icon: '💡', color: '#A87A12', keywords: 'idea, what if, brainstorm' },
      { id: 'ty_fu', name: 'Follow-up', icon: '📞', color: '#0E7C86', keywords: 'follow up, follow-up, call, email, reply, text, ping, check in, ask' },
      { id: 'ty_err', name: 'Errand', icon: '🛒', color: '#5A6B2E', keywords: 'buy, pick up, drop off, groceries, return, errand' },
      { id: 'ty_mtg', name: 'Meeting', icon: '📅', color: '#8A3FA0', keywords: 'meeting, meet with, lunch with, coffee with, appointment' },
      { id: 'ty_note', name: 'Note', icon: '📝', color: '#64748B', keywords: 'fyi, note to self' },
    ],
    priorities: [
      { id: 'pr_urg', name: 'Urgent', color: '#B42318' },
      { id: 'pr_high', name: 'High', color: '#C2410C' },
      { id: 'pr_med', name: 'Medium', color: '#A87A12' },
      { id: 'pr_low', name: 'Low', color: '#2F5D9E' },
      { id: 'pr_some', name: 'Someday', color: '#64748B' },
    ],
    statuses: [
      { id: 'st_todo', name: 'To do', color: '#2F5D9E', done: false },
      { id: 'st_doing', name: 'Doing', color: '#A87A12', done: false },
      { id: 'st_wait', name: 'Waiting', color: '#8A3FA0', done: false },
      { id: 'st_done', name: 'Done', color: '#1E6B52', done: true },
    ],
    durations: [5, 15, 30, 60, 120, 240, 480],
    fields: [],
    tasks: [],
  };
}

const UI_DEFAULT = {
  view: 'board', group: 'area', lanes: 'none', sort: 'manual', cursor: null, density: 'cozy', theme: 'auto', copyDrop: false,
  f: { q: '', type: '', pri: '', status: 'open', due: '', rep: '' },
  listSort: { key: 'order', dir: 1 }, settingsTab: 'hierarchy', triageAuto: true, started: false, exp: {},
};

let D = null, U = null;
let A = {}, KIDS = {}, T = {}, PR = {}, ST = {}, TASK = {}, PRANK = {}, CH = {};

/* card background tints (names map to CSS variables, so they work in light and dark) */
const CARD_COLORS = [['', 'No color'], ['red', 'Red'], ['orange', 'Orange'], ['yellow', 'Yellow'], ['green', 'Green'], ['teal', 'Teal'], ['blue', 'Blue'], ['purple', 'Purple'], ['pink', 'Pink'], ['gray', 'Gray']];
const COLOR_NAME = Object.fromEntries(CARD_COLORS);
const tintVar = c => (c && COLOR_NAME[c] ? `var(--tint-${c})` : '');

function loadData() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) { console.warn('HatRack: could not read saved data', e); }
  return defaultData();
}
function migrate(d) {
  const base = defaultData();
  if (!d || typeof d !== 'object') return base;
  for (const k of Object.keys(base)) if (d[k] == null) d[k] = base[k];
  if (!Array.isArray(d.tasks)) d.tasks = [];
  d.areas.forEach((a, i) => { a.id ||= uid('ar'); a.name = String(a.name || 'Untitled'); a.parentId ||= null; a.keywords ||= ''; a.notes ||= ''; if (a.order == null) a.order = i; });
  if (!d.statuses.some(s => !s.done)) d.statuses.unshift({ id: uid('st'), name: 'To do', color: '#2F5D9E', done: false });
  return d;
}
function fixTask(t, i) {
  t.id ||= uid('t'); t.title = String(t.title ?? '').trim() || 'Untitled';
  t.notes ||= ''; if (!Array.isArray(t.subnotes)) t.subnotes = []; if (!Array.isArray(t.attachments)) t.attachments = [];
  if (!Array.isArray(t.tags)) t.tags = typeof t.tags === 'string' ? t.tags.split(',').map(s => s.trim()).filter(Boolean) : [];
  t.subnotes.forEach(s => { s.id ||= uid('s'); s.text = String(s.text ?? ''); s.done = !!s.done; s.note ||= ''; });
  t.custom ||= {}; t.seen ||= 1; t.created ||= now(); t.updated ||= t.created; t.repeat ||= ''; t.source ||= '';
  if (t.order == null || isNaN(t.order)) t.order = i ?? 0;
  if (t.areaId && !A[t.areaId]) t.areaId = null;
  if (!t.statusId || !ST[t.statusId]) t.statusId = defaultStatus();
  if (t.typeId && !T[t.typeId]) t.typeId = null;
  if (t.priorityId && !PR[t.priorityId]) t.priorityId = null;
  if (!t.parentId) t.parentId = null;
  if (t.color && !COLOR_NAME[t.color]) t.color = '';
  t.color ||= '';
  return t;
}
/** tidy freshly loaded or restored data */
function normalizeData() {
  reindex(); D.tasks.forEach(fixTask); reindex(); fixHierarchy(); reindex();
  if (U && U.exp) for (const id of Object.keys(U.exp)) if (!TASK[id]) delete U.exp[id];
}
function loadUI() {
  let u = {};
  try { u = JSON.parse(localStorage.getItem(LS_UI) || '{}') || {}; } catch (e) { }
  return { ...clone(UI_DEFAULT), ...u, f: { ...UI_DEFAULT.f, ...(u.f || {}) }, listSort: { ...UI_DEFAULT.listSort, ...(u.listSort || {}) } };
}

/* ---------- indexes & lookups ---------- */
function reindex() {
  A = Object.fromEntries(D.areas.map(a => [a.id, a]));
  KIDS = {};
  for (const a of D.areas) { const p = a.parentId && A[a.parentId] ? a.parentId : ''; if (!a.parentId || !A[a.parentId]) a.parentId = null; (KIDS[p] ||= []).push(a); }
  for (const k in KIDS) KIDS[k].sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
  T = Object.fromEntries(D.types.map(x => [x.id, x]));
  PR = Object.fromEntries(D.priorities.map(x => [x.id, x]));
  PRANK = Object.fromEntries(D.priorities.map((x, i) => [x.id, i]));
  ST = Object.fromEntries(D.statuses.map(x => [x.id, x]));
  TASK = Object.fromEntries(D.tasks.map(t => [t.id, t]));
  CH = {};
  for (const t of D.tasks) if (t.parentId && TASK[t.parentId] && t.parentId !== t.id) (CH[t.parentId] ||= []).push(t);
  for (const k in CH) CH[k].sort((x, y) => x.order - y.order);
  if (U && U.cursor && !A[U.cursor]) U.cursor = null;
}
const kids = id => KIDS[id || ''] || [];
function ancestors(id) { const out = []; let a = A[id], g = 0; while (a && g++ < 64) { out.unshift(a); a = A[a.parentId]; } return out; }
const depthOf = id => ancestors(id).length;
const pathStr = (id, sep = ' / ') => ancestors(id).map(a => a.name).join(sep);
function inSubtree(id, rootId) { if (!rootId) return true; let a = A[id], g = 0; while (a && g++ < 64) { if (a.id === rootId) return true; a = A[a.parentId]; } return false; }
function areaColor(id) { const anc = ancestors(id); for (let i = anc.length - 1; i >= 0; i--) if (anc[i].color) return anc[i].color; return null; }
const topOf = id => ancestors(id)[0] || null;
const levelName = d => D.levelNames[d - 1] || `Level ${d}`;
function descendants(id) { const out = []; const walk = p => kids(p).forEach(a => { out.push(a); walk(a.id); }); walk(id); return out; }
function areaTreeFlat(rootId = null) { const out = []; const walk = (p, d) => kids(p).forEach(a => { out.push({ a, d }); walk(a.id, d + 1); }); walk(rootId, 0); return out; }
const defaultStatus = () => (D.statuses.find(s => !s.done) || D.statuses[0]).id;
const doneStatus = () => (D.statuses.find(s => s.done) || D.statuses[D.statuses.length - 1]).id;
const isDone = t => !!ST[t.statusId]?.done;
const prank = t => PRANK[t.priorityId] ?? 99;
const cur = () => (U.cursor && A[U.cursor] ? U.cursor : null);
function nextColor(extra = []) {
  const used = new Set(D.areas.concat(extra).filter(a => !a.parentId).map(a => a.color));
  return PALETTE.find(c => !used.has(c)) || PALETTE[(D.areas.length + extra.length) % PALETTE.length];
}

/* ---------- subtask hierarchy ---------- */
const MAX_NEST = 3; // a top-level task plus three levels of subtasks (Todoist supports four levels)
const childrenOf = id => CH[id] || [];
const parentOf = t => (t && t.parentId && TASK[t.parentId] && t.parentId !== t.id ? TASK[t.parentId] : null);
function taskAncestors(t) { const out = []; const seen = new Set([t.id]); let p = parentOf(t); while (p && !seen.has(p.id)) { seen.add(p.id); out.unshift(p); p = parentOf(p); } return out; }
const rootOf = t => taskAncestors(t)[0] || t;
const taskDepth = t => taskAncestors(t).length;
const isRootTask = t => !parentOf(t);
function taskDescendants(t) { const out = []; const seen = new Set([t.id]); const walk = x => childrenOf(x.id).forEach(c => { if (seen.has(c.id)) return; seen.add(c.id); out.push(c); walk(c); }); walk(t); return out; }
function subtreeHeight(t, g = 0) { let h = 0; if (g > 8) return h; childrenOf(t.id).forEach(c => { h = Math.max(h, 1 + subtreeHeight(c, g + 1)); }); return h; }
function canNest(child, parent) {
  if (!child || !parent || child.id === parent.id) return false;
  if (taskAncestors(parent).some(a => a.id === child.id)) return false;
  return taskDepth(parent) + 1 + subtreeHeight(child) <= MAX_NEST;
}
/** set a task's group and carry its subtasks along */
function setAreaDeep(t, areaId) { t.areaId = areaId || null; taskDescendants(t).forEach(c => { c.areaId = t.areaId; }); }
/** keep only the top-most tasks of a set (children travel with their parents) */
function topmost(list) { const ids = new Set(list.map(t => t.id)); return list.filter(t => !taskAncestors(t).some(a => ids.has(a.id))); }
/** a set of tasks plus all their subtasks */
function withDescendants(list) { const out = new Map(); list.forEach(t => { out.set(t.id, t); taskDescendants(t).forEach(c => out.set(c.id, c)); }); return [...out.values()]; }
/** make child a subtask of parent (inside mutate). Returns false if it can't nest there. */
function nestTask(child, parent) {
  if (!canNest(child, parent)) return false;
  child.parentId = parent.id; setAreaDeep(child, parent.areaId);
  child.order = maxOrder() + 1; child.updated = now();
  CH[parent.id] = [...childrenOf(parent.id).filter(c => c.id !== child.id), child];
  return true;
}
/** repair parent links after loading data: drop missing parents and loops; subtasks share their top task's group */
function fixHierarchy() {
  const byId = Object.fromEntries(D.tasks.map(t => [t.id, t]));
  for (const t of D.tasks) {
    if (t.parentId && !byId[t.parentId]) t.parentId = null;
    const seen = new Set([t.id]); let p = byId[t.parentId], g = 0;
    while (p && g++ < 32) { if (seen.has(p.id)) { t.parentId = null; break; } seen.add(p.id); p = byId[p.parentId]; }
  }
  reindex();
  for (const t of D.tasks) if (t.parentId) { const r = rootOf(t); if (t.areaId !== r.areaId) t.areaId = r.areaId; }
}

/* ---------- tasks ---------- */
function maxOrder() { let m = 0; for (const t of D.tasks) if (t.order > m) m = t.order; return m; }
function newTask(p = {}) {
  const t = {
    id: uid('t'), title: '', notes: '', subnotes: [], attachments: [], areaId: null, typeId: null, priorityId: null,
    statusId: defaultStatus(), duration: null, due: null, repeat: '', tags: [], source: '', seen: 1, custom: {}, parentId: null, color: '',
    order: maxOrder() + 1, created: now(), updated: now(), ...p,
  };
  return t;
}
function dupTask(t) {
  const c = clone(t); c.id = uid('t'); c.created = c.updated = now(); c.seen = 1;
  c.subnotes = (c.subnotes || []).map(s => ({ ...s, id: uid('s') }));
  c.attachments = (c.attachments || []).map(a => ({ ...a, id: uid('at') })); // file blobs are shared, never deleted while referenced
  c.order = t.order + 0.5; return c;
}
/** copy a task with all its subtasks; returns [copy, ...subtask copies] (call inside mutate, then push) */
function dupDeep(t) {
  const map = new Map(); const out = [];
  [t, ...taskDescendants(t)].forEach(x => { const c = dupTask(x); map.set(x.id, c.id); out.push(c); });
  out.forEach((c, i) => { if (i > 0) c.parentId = map.get(c.parentId) || out[0].id; });
  let ord = maxOrder(); out.forEach((c, i) => { if (i > 0) c.order = ++ord; });
  return out;
}
function renumber() { D.tasks.sort((a, b) => a.order - b.order).forEach((t, i) => t.order = i + 1); }

/** status change; recurring tasks reschedule instead of closing. Returns a message or null. */
function setStatus(t, sid) {
  const st = ST[sid];
  if (st && st.done && t.repeat) {
    const td = todayStr(); let nd = nextDue(t.due || td, t.repeat), g = 0;
    while (nd < td && g++ < 1000) nd = nextDue(nd, t.repeat);
    t.due = nd; t.doneCount = (t.doneCount || 0) + 1; t.lastDone = td; t.statusId = defaultStatus();
    t.subnotes.forEach(s => s.done = false);
    taskDescendants(t).forEach(c => { c.statusId = defaultStatus(); c.subnotes.forEach(s => s.done = false); });
    return `“${t.title}” repeats — next due ${fmtDate(nd)}`;
  }
  t.statusId = sid || defaultStatus();
  if (st?.done) t.doneAt = now();
  return null;
}

/* ---------- due & duration buckets ---------- */
function dueBucket(t) {
  if (!t.due) return 'none';
  const td = todayStr();
  if (t.due < td) return 'overdue';
  if (t.due === td) return 'today';
  const eow = endOfWeek(td);
  if (t.due <= eow) return 'week';
  if (t.due <= addDays(eow, 7)) return 'next';
  return 'later';
}
function dueForBucket(b) {
  const td = todayStr(); const dow = parseYMD(td).getDay(); const eow = endOfWeek(td);
  switch (b) {
    case 'today': return td;
    case 'week': return dow >= 1 && dow <= 4 ? nextWeekdayOnOrAfter(td, 5) : (eow > td ? eow : addDays(td, 1));
    case 'next': return addDays(eow, 1);
    case 'later': return addDays(td, 30);
    case 'none': return null;
  }
  return null;
}
const DUE_COLS = [['overdue', 'Overdue'], ['today', 'Today'], ['week', 'This week'], ['next', 'Next week'], ['later', 'Later'], ['none', 'No date']];
function durPresets() { return [...new Set(D.durations.map(Number).filter(n => n > 0))].sort((a, b) => a - b); }
function durBucket(min) { if (!min) return null; const p = durPresets(); if (!p.length) return null; return p.find(x => x >= min) ?? p[p.length - 1]; }

/* ---------- persistence ---------- */
let saveTimer = null, storageWarned = false;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 200); }
function flushSave() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(LS_KEY, JSON.stringify(D)); storageWarned = false; }
  catch (e) { if (!storageWarned) { storageWarned = true; toast('Could not save — browser storage is full or blocked. Export a backup from Configure → Data.'); } }
}
function saveUI() { try { localStorage.setItem(LS_UI, JSON.stringify(U)); } catch (e) { } }

/* ---------- undo ---------- */
const undoStack = [];
function snapshot(label) { undoStack.push({ label, data: JSON.stringify(D) }); if (undoStack.length > 50) undoStack.shift(); }
function undo() {
  const s = undoStack.pop();
  if (!s) { toast('Nothing to undo'); return; }
  D = JSON.parse(s.data); reindex(); save(); closeDrawer(true); renderAll();
  toast(`Undid: ${s.label}`);
}
/** run a change with an undo step, persist and re-render */
function mutate(label, fn, opts = {}) {
  snapshot(label); editDirty = false;
  const r = fn();
  reindex(); save();
  if (opts.render !== false) renderAll();
  if (opts.toast) toast(opts.toast, { undo: true });
  return r;
}

/* ---------- attachment file store (IndexedDB, built into every browser) ---------- */
const FileStore = {
  _db: null,
  open() {
    if (!this._db) this._db = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('IndexedDB unavailable'));
      const r = indexedDB.open('hatrack-files', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return this._db;
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => { const tx = db.transaction('files', mode); const st = tx.objectStore('files'); const out = fn(st); tx.oncomplete = () => res(out && 'result' in out ? out.result : undefined); tx.onerror = () => rej(tx.error); });
  },
  put(id, rec) { return this.tx('readwrite', st => st.put(rec, id)); },
  get(id) { return this.tx('readonly', st => st.get(id)); },
  del(id) { return this.tx('readwrite', st => st.delete(id)); },
  keys() { return this.tx('readonly', st => st.getAllKeys()); },
};
async function cleanOrphanFiles() {
  try {
    const used = new Set(); D.tasks.forEach(t => t.attachments.forEach(a => a.fileId && used.add(a.fileId)));
    const keys = await FileStore.keys();
    for (const k of keys || []) if (!used.has(k)) await FileStore.del(k);
  } catch (e) { /* storage not available; ignore */ }
}
