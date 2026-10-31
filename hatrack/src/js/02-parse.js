/* ============ HatRack — import parser (notes, lists, spreadsheets) ============ */

/** Area resolver that can stage new areas (from headings) without touching data until commit. */
class AreaCtx {
  constructor(create) { this.create = !!create; this.pending = []; }
  all() { return D.areas.concat(this.pending); }
  get(id) { return A[id] || this.pending.find(a => a.id === id) || null; }
  ancestors(id) { const out = []; let a = this.get(id), g = 0; while (a && g++ < 64) { out.unshift(a); a = a.parentId ? this.get(a.parentId) : null; } return out; }
  path(id, sep = ' / ') { return this.ancestors(id).map(a => a.name).join(sep); }
  depth(id) { return this.ancestors(id).length; }
  children(pid) { return this.all().filter(a => (a.parentId || null) === (pid || null)).sort((x, y) => (x.order ?? 0) - (y.order ?? 0)); }
  inSub(id, root) { if (!root) return true; return this.ancestors(id).some(a => a.id === root); }
  match(list, name, prefix = false) {
    const n = norm(name); if (!n) return null;
    const ex = list.find(a => norm(a.name) === n); if (ex || !prefix || n.length < 3) return ex || null;
    const ps = list.filter(a => norm(a.name).startsWith(n)); return ps.length === 1 ? ps[0] : null;
  }
  findAnywhere(name, prefix = false, within = null) {
    const list = this.all().filter(a => !within || (a.id !== within && this.inSub(a.id, within)));
    const n = norm(name); if (!n) return null;
    const ex = list.filter(a => norm(a.name) === n);
    if (ex.length) return ex.sort((x, y) => this.depth(x.id) - this.depth(y.id))[0];
    if (!prefix || n.length < 3) return null;
    const ps = list.filter(a => norm(a.name).startsWith(n)); return ps.length === 1 ? ps[0] : null;
  }
  add(name, parentId) {
    const a = { id: uid('ar'), name: name.trim(), parentId: parentId || null, color: parentId ? '' : nextColor(this.pending), keywords: '', notes: '', order: 1000 + this.pending.length, _new: true };
    this.pending.push(a); return a;
  }
  /** a heading line → area id (existing, or staged new one) */
  heading(name, parentId) {
    name = name.replace(/\s*:\s*$/, '').trim(); if (!name) return parentId;
    let a = this.match(this.children(parentId), name, true) || (parentId ? this.findAnywhere(name, true, parentId) : this.findAnywhere(name, true));
    if (!a) { const n = norm(name); const pool = this.all().filter(x => !parentId || this.inSub(x.id, parentId)); const hits = pool.filter(x => kwList(x.keywords).some(k => norm(k) === n)); if (hits.length === 1) a = hits[0]; }
    if (!a && this.create) a = this.add(name, parentId);
    return a ? a.id : parentId;
  }
  /** "Parent / Entity / Sub" → id. Returns deepest resolved id when create=false. */
  pathToId(path, base = null, create = false, prefix = true) {
    const parts = String(path).split(/\s*(?:\/|›|»|>|\\)\s*/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return null;
    let first = (base && this.match(this.children(base), parts[0], prefix)) || this.match(this.children(null), parts[0], prefix) || this.findAnywhere(parts[0], prefix);
    if (!first) { if (!create) return null; first = this.add(parts[0], null); }
    let id = first.id;
    for (const p of parts.slice(1)) {
      let c = this.match(this.children(id), p, prefix);
      if (!c) { if (!create) return id; c = this.add(p, id); }
      id = c.id;
    }
    return id;
  }
  isNew(id) { return this.pending.some(a => a.id === id); }
  commit() { const base = D.areas.length; this.pending.forEach((a, i) => { delete a._new; a.order = base + i; D.areas.push(a); }); this.pending = []; }
}

/* ---------- matching helpers ---------- */
const kwList = s => String(s || '').split(/[,;\n]/).map(x => x.trim().toLowerCase()).filter(Boolean);
const _kwCache = new Map();
function kwFind(text, kw) {
  let re = _kwCache.get(kw);
  if (!re) { re = new RegExp('(^|[^\\p{L}\\p{N}])' + reEsc(kw) + '(?=$|[^\\p{L}\\p{N}])', 'iu'); _kwCache.set(kw, re); }
  const m = re.exec(text); return m ? m.index + m[1].length : -1;
}
function matchType(w) {
  const n = norm(w); if (!n) return null;
  return D.types.find(t => norm(t.name) === n || norm(t.name) + 's' === n || norm(t.name) + 'es' === n)
    || (n.length >= 3 ? (l => l.length === 1 ? l[0] : null)(D.types.filter(t => norm(t.name).startsWith(n))) : null);
}
function matchPriority(w) {
  const s = String(w).trim().toLowerCase(); const n = norm(s); if (!n) return null;
  const P = D.priorities; let m;
  if ((m = /^p?(\d)$/.exec(s))) {
    const k = +m[1]; if (!P.length) return null;
    if (s.startsWith('p') && P.length !== 4) return P[Math.round((Math.min(Math.max(k, 1), 4) - 1) * (P.length - 1) / 3)];
    return P[Math.min(Math.max(k, 1), P.length) - 1];
  }
  return P.find(p => norm(p.name) === n) || (n.length >= 3 ? (l => l.length === 1 ? l[0] : null)(P.filter(p => norm(p.name).startsWith(n))) : null)
    || ({ hi: P[1] || P[0], med: P[Math.floor(P.length / 2)], lo: P[P.length - 2] || P[P.length - 1] }[n] || null);
}
function matchStatus(w) {
  const n = norm(w); if (!n) return null;
  if (['true', 'yes', 'x', 'done', 'complete', 'completed', 'closed', '1'].includes(n)) return ST[doneStatus()];
  if (['false', 'no', 'open', '0', 'todo', 'incomplete'].includes(n)) return ST[defaultStatus()];
  return D.statuses.find(s => norm(s.name) === n) || null;
}
const titleCase = s => s.toLowerCase().replace(/(^|[\s\-\/&(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
const isAllCaps = s => /\p{L}{2}/u.test(s) && s === s.toUpperCase() && s !== s.toLowerCase() && s.length <= 60;
const dupKey = title => norm(String(title).replace(/^(remind me (to|about)|reminder|todo|to do|task)\b[\s:\-–—]*/i, ''));

/* ---------- line helpers ---------- */
function stripBullet(s) {
  let bullet = false, done = false, m;
  if ((m = /^(?:[-*+•▪◦‣●○■□►▸➤→–—]|\d{1,3}[.)])\s+/.exec(s))) { bullet = true; s = s.slice(m[0].length); }
  if ((m = /^\[( |x|X|\/|-)?\]\s*/.exec(s))) { bullet = true; done = /x/i.test(m[1] || ''); s = s.slice(m[0].length); }
  else if ((m = /^([☐☑☒✓✔])\s*/.exec(s))) { bullet = true; done = m[1] !== '☐'; s = s.slice(m[0].length); }
  return { text: s.trim(), bullet, done };
}
function toRows(text) {
  return text.split('\n').map(raw => {
    if (!raw.trim()) return null;
    const indent = raw.match(/^[ \t]*/)[0].replace(/\t/g, '    ').length;
    const b = stripBullet(raw.trim());
    if (!/[\p{L}\p{N}]/u.test(b.text)) return null;
    return { indent, ...b };
  });
}
const nextRow = (rows, i) => { for (let j = i + 1; j < rows.length; j++) if (rows[j]) return rows[j]; return null; };
const hasTokens = s => /(^|\s)[@#!~^*]\S/.test(s);

function detectMode(text) {
  const first = text.split('\n').find(l => l.trim());
  if (!first) return 'lines';
  if (/[,\t;]/.test(first)) {
    const delim = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
    const cells = parseCSV(first, delim)[0] || [];
    const hn = cells.map(norm);
    if (hn.some(h => HDR.title.includes(h)) || (hn.includes('type') && hn.includes('content'))) return 'sheet';
  }
  const blocks = text.split(/\n[ \t]*\n/).map(b => b.split('\n').filter(l => l.trim())).filter(b => b.length);
  if (blocks.length < 2) return 'lines';
  const headingish = l => /:\s*$/.test(l) || /^#{1,6}\s/.test(l.trim()) || isAllCaps(l.trim()) || stripBullet(l.trim()).bullet;
  const prose = l => !/^\s/.test(l) && !stripBullet(l.trim()).bullet && !/^#{1,6}\s/.test(l.trim()) && (/[.!?,;]\s*$|[.!?;]\s/.test(l) || l.trim().length > 60);
  const multi = blocks.filter(b => b.length > 1);
  const titled = multi.filter(b => !headingish(b[0]) && b.slice(1).some(prose));
  return titled.length && titled.length >= multi.length / 2 ? 'blocks' : 'lines';
}

/* ---------- parse state ---------- */
function makeState(opt) {
  const st = {
    opt, ctx: new AreaCtx(opt.create), items: [], stack: [], last: null,
    areaCtx() { for (let i = st.stack.length - 1; i >= 0; i--) if (st.stack[i].kind === 'area') return st.stack[i].id; return opt.base || null; },
    ctxOf(kind) { for (let i = st.stack.length - 1; i >= 0; i--) if (st.stack[i].kind === kind) return st.stack[i].id; return null; },
    pushHeading(h) {
      while (st.stack.length && st.stack[st.stack.length - 1].rank >= h.rank) st.stack.pop();
      const ty = !h.areaId && matchTypeHeading(h.name), pr = !h.areaId && !ty && D.priorities.find(p => norm(p.name) === norm(h.name));
      const base = { rank: h.rank, md: !!h.md, indent: h.md ? null : (h.indent ?? 0), kids: 0, kidBullet: false };
      if (ty) st.stack.push({ ...base, kind: 'type', id: ty.id });
      else if (pr) st.stack.push({ ...base, kind: 'priority', id: pr.id });
      else st.stack.push({ ...base, kind: 'area', id: h.areaId || st.ctx.heading(h.name, st.areaCtx()) });
    },
    /** a plain "Heading:" stops applying when the list style changes or after a blank line */
    endScopes(r, blankBefore) {
      while (st.stack.length) {
        const h = st.stack[st.stack.length - 1];
        if (h.md || h.indent == null || r.indent > h.indent || r.bullet || !h.kids) break;
        if (h.kidBullet || blankBefore) { st.stack.pop(); continue; }
        break;
      }
    },
    noteKid(r) { const h = st.stack[st.stack.length - 1]; if (h && !h.md) { if (!h.kids) h.kidBullet = !!r.bullet; h.kids++; } },
    newItem(text, done) {
      const it = { title: text, notes: '', subnotes: [], areaId: st.areaCtx(), typeId: st.ctxOf('type'), priorityId: st.ctxOf('priority'), done: !!done, tags: [], custom: {}, duration: null, due: null, repeat: '' };
      st.items.push(it); return it;
    },
  };
  return st;
}
function matchTypeHeading(name) {
  const n = norm(name); return D.types.find(t => norm(t.name) === n || norm(t.name) + 's' === n || norm(t.name) + 'es' === n) || null;
}

function headingOf(r, next, st, blocksMode) {
  if (r.bullet) return null;
  const md = /^(#{1,6})\s+(.+)$/.exec(r.text);
  if (md) return { name: md[2].replace(/\s+#+\s*$/, '').replace(/\s*:\s*$/, ''), rank: md[1].length, md: true };
  const rank = 10 + Math.floor(r.indent / 2), indent = r.indent;
  if (/^[^:]{1,80}:\s*$/.test(r.text)) return { name: r.text.replace(/:\s*$/, ''), rank, indent };
  if (hasTokens(r.text)) return null;
  const hasKids = !!next && (next.indent > r.indent || (next.bullet && next.indent === r.indent));
  const known = st.ctx.match(st.ctx.children(st.areaCtx()), r.text) || st.ctx.findAnywhere(r.text);
  if (known) return { name: r.text, rank, indent, areaId: known.id };
  if (matchTypeHeading(r.text) && hasKids) return { name: r.text, rank, indent };
  if (!hasKids) return null;
  if (isAllCaps(r.text) && st.opt.group !== 'strict') return { name: titleCase(r.text), rank, indent };
  if (!blocksMode && st.opt.group === 'groups') return { name: r.text, rank, indent };
  return null;
}

function parseLinesInto(rows, st) {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue;
    const next = nextRow(rows, i);
    const li = st.last;
    if (li && (r.indent > li.indent || (li.absorb && r.bullet && r.indent === li.indent)) && !/^#{1,6}\s/.test(r.text)) {
      li.item.subnotes.push({ text: r.text, done: r.done, indent: r.indent - li.indent }); continue;
    }
    st.last = null;
    st.endScopes(r, i > 0 && rows[i - 1] === null);
    const h = headingOf(r, next, st, false);
    if (h) { st.pushHeading(h); continue; }
    st.noteKid(r);
    const item = st.newItem(r.text, r.done);
    st.last = { item, indent: r.indent, absorb: !r.bullet && !!next && next.bullet && next.indent === r.indent };
  }
}
function parseBlocksInto(text, st) {
  for (const b of text.split(/\n[ \t]*\n/)) {
    const rows = toRows(b).filter(Boolean); if (!rows.length) continue;
    st.last = null;
    st.endScopes(rows[0], true);
    const h = headingOf(rows[0], rows[1] || null, st, true);
    if (h) { st.pushHeading(h); if (rows.length > 1) parseLinesInto(rows.slice(1), st); continue; }
    st.noteKid(rows[0]);
    const it = st.newItem(rows[0].text, rows[0].done); const notes = [];
    for (const r of rows.slice(1)) { if (r.bullet) it.subnotes.push({ text: r.text, done: r.done, indent: r.indent + 1 }); else notes.push(r.text); }
    it.notes = notes.join('\n');
  }
}

/* ---------- spreadsheet (CSV / TSV) ---------- */
const HDR = {
  title: ['title', 'name', 'task', 'taskname', 'tasktitle', 'content', 'todo', 'item', 'summary', 'subject', 'card', 'cardname'],
  notes: ['notes', 'note', 'description', 'details', 'body', 'desc', 'comments'],
  path: ['path', 'areapath', 'fullpath'],
  area: ['area', 'sector', 'category', 'group', 'list', 'project', 'section', 'sectioncolumn', 'column', 'folder'],
  type: ['type', 'tasktype', 'kind'],
  priority: ['priority', 'pri', 'importance', 'prio'],
  status: ['status', 'state', 'stage', 'done', 'completed'],
  due: ['due', 'duedate', 'deadline', 'date', 'dueon', 'when'],
  duration: ['duration', 'durationmin', 'durationminutes', 'minutes', 'estimate', 'estimatedminutes', 'estimatedtime', 'time', 'mins', 'effort'],
  repeat: ['repeat', 'recurrence', 'recurring', 'every', 'repeats'],
  tags: ['tags', 'labels', 'tag', 'label'],
  source: ['source', 'from', 'origin'],
  subnotes: ['subnotes', 'subtasks', 'checklist', 'checklistitems'],
  seen: ['timesnoted', 'seen', 'count'],
  extid: ['id', 'taskid'],
  extparent: ['parentid'],
  color: ['color', 'cardcolor'],
};
const LEVEL_ALIASES = [['parent', 'business', 'company', 'organization', 'organisation', 'org', 'client', 'hat'], ['entity', 'subgroup', 'subproject', 'department'], ['subbranch', 'branch']];

function parseCSV(text, delim = ',') {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"' && f === '') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

function parseSheetInto(text, st) {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split('\n')[0];
  const delim = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
  const rows = parseCSV(text, delim); if (!rows.length) return;
  const head = rows[0].map(h => norm(String(h).replace(/\(.*?\)/g, '')));
  const raw = rows[0].map(h => String(h).trim());
  const col = k => head.findIndex(h => HDR[k].includes(h));
  // Todoist template/export (TYPE, CONTENT, PRIORITY, INDENT …)
  if (raw.includes('TYPE') && raw.includes('CONTENT')) return parseTodoistInto(rows, raw, st);
  const levelCols = [];
  for (let l = 0; l < 6; l++) {
    const names = [norm(D.levelNames[l] || ''), ...(LEVEL_ALIASES[l] || [])].filter(Boolean);
    const i = head.findIndex(h => names.includes(h)); if (i >= 0) levelCols.push(i); else break;
  }
  const ci = Object.fromEntries(Object.keys(HDR).map(k => [k, col(k)]));
  const cfCols = D.fields.map(f => [f, head.indexOf(norm(f.name))]).filter(x => x[1] >= 0);
  for (const r of rows.slice(1)) {
    const g = k => (ci[k] >= 0 ? String(r[ci[k]] ?? '').trim() : '');
    const title = g('title'); if (!title) continue;
    const it = st.newItem(title, false);
    it.notes = g('notes');
    let areaId = null;
    if (ci.path >= 0 && g('path')) areaId = st.ctx.pathToId(g('path'), st.opt.base, st.opt.create, false);
    else if (levelCols.length) { const parts = levelCols.map(i => String(r[i] ?? '').trim()).filter(Boolean); if (parts.length) areaId = st.ctx.pathToId(parts.join(' / '), null, st.opt.create, false); }
    else if (ci.area >= 0 && g('area')) areaId = st.ctx.pathToId(g('area'), st.opt.base, st.opt.create, false);
    if (areaId) it.areaId = areaId;
    if (g('type')) { const ty = matchType(g('type')); if (ty) it.typeId = ty.id; else it.tags.push(g('type')); }
    if (g('priority')) { const p = matchPriority(g('priority')); if (p) it.priorityId = p.id; }
    if (g('status')) { const s = matchStatus(g('status')); if (s) { it.statusId = s.id; it.done = !!s.done; } }
    if (g('due')) it.due = parseDue(g('due'));
    if (g('duration')) it.duration = parseDuration(g('duration'));
    if (g('repeat')) it.repeat = REPEAT_ALIAS[norm(g('repeat').replace(/^every\s*/i, ''))] || REPEAT_ALIAS[norm(g('repeat'))] || '';
    if (g('tags')) it.tags.push(...g('tags').split(/[,;]/).map(s => s.trim().replace(/^[#@]/, '')).filter(Boolean));
    if (g('source')) it.source = g('source');
    if (g('seen')) it.seen = Math.max(1, parseInt(g('seen'), 10) || 1);
    if (g('extid')) it.extId = g('extid');
    if (g('extparent')) it.extParent = g('extparent');
    if (g('color') && COLOR_NAME[g('color').toLowerCase()]) it.color = g('color').toLowerCase();
    if (g('subnotes')) g('subnotes').split(/\s*;\s*|\n/).filter(Boolean).forEach(s => { const b = stripBullet(s.trim()); it.subnotes.push({ text: b.text, done: b.done }); });
    for (const [f, i] of cfCols) { const v = String(r[i] ?? '').trim(); if (v) it.custom[f.id] = f.kind === 'checkbox' ? /^(1|true|yes|x)$/i.test(v) : v; }
  }
}
function parseTodoistInto(rows, raw, st) {
  const ix = k => raw.indexOf(k);
  const I = { type: ix('TYPE'), content: ix('CONTENT'), desc: ix('DESCRIPTION'), pri: ix('PRIORITY'), indent: ix('INDENT'), date: ix('DATE'), dur: ix('DURATION'), unit: ix('DURATION_UNIT') };
  let last = null;
  for (const r of rows.slice(1)) {
    const type = String(r[I.type] || '').trim().toLowerCase(); const content = String(r[I.content] || '').trim();
    if (type === 'section') { st.pushHeading({ name: content, rank: 10 }); last = null; continue; }
    if (type === 'note' && last) { last.notes = (last.notes ? last.notes + '\n' : '') + content; continue; }
    if (type !== 'task' || !content) continue;
    const indent = parseInt(r[I.indent], 10) || 1;
    if (indent > 1 && last) { last.subnotes.push({ text: content, done: false, indent: indent - 1, notes: I.desc >= 0 ? String(r[I.desc] || '') : '' }); continue; }
    const it = st.newItem(content, false);
    it.notes = I.desc >= 0 ? String(r[I.desc] || '') : '';
    const p = parseInt(r[I.pri], 10); if (p >= 1 && p <= 3 && D.priorities.length) it.priorityId = D.priorities[Math.min(p - 1, D.priorities.length - 1)].id; // Todoist p4 = no priority
    const ds = I.date >= 0 ? String(r[I.date] || '').trim() : '';
    if (ds) { const m = /^every\s+(.+?)(?:\s+starting\s+(.+))?$/i.exec(ds); if (m) { it.repeat = REPEAT_ALIAS[norm(m[1])] || (m[1].match(/^2\s*weeks?$/i) ? 'biweekly' : m[1].match(/^3\s*months?$/i) ? 'quarterly' : ''); if (m[2]) it.due = parseDue(m[2]); } else it.due = parseDue(ds); }
    const dv = I.dur >= 0 ? parseInt(r[I.dur], 10) : NaN; if (dv > 0) it.duration = String(r[I.unit] || '').toLowerCase().startsWith('day') ? dv * 480 : dv;
    last = it;
  }
}

/* ---------- tokens & auto-sort ---------- */
function applyTokens(it, st) {
  let s = ' ' + it.title + ' ';
  s = s.replace(/(\s)@"([^"]+)"|(\s)@([^\s"@]+)/gu, (m, s1, q, s2, w) => {
    const p = (q || w).replace(/[.,;:!?)]+$/, '').replace(/_/g, ' ');
    const id = st.ctx.pathToId(p, st.opt.base, false, true);
    if (id) { it.areaId = id; it.areaLocked = true; return ' '; }
    return m;
  });
  s = s.replace(/(\s)#(\p{L}[\p{L}\p{N}_\-]*)/gu, (m, sp, w) => {
    const ty = matchType(w); if (ty) { if (!it.typeId || !it.typeFromToken) { it.typeId = ty.id; it.typeFromToken = true; } return ' '; }
    it.tags.push(w); return ' ';
  });
  s = s.replace(/(\s)!(\p{L}[\p{L}\p{N}\-]*|p?\d)(?=\s)/giu, (m, sp, w) => { const p = matchPriority(w); if (p) { it.priorityId = p.id; return ' '; } return m; });
  s = s.replace(/(\s)~([0-9][0-9.:]*\s?(?:days?|d|hours?|hrs?|h|minutes?|mins?|m)?(?:\s?\d+\s?(?:minutes?|mins?|m))?)(?=\s)/giu, (m, sp, w) => { const d = parseDuration(w); if (d) { it.duration = d; return ' '; } return m; });
  s = s.replace(/(\s)\^"([^"]+)"|(\s)\^(\S+)/gu, (m, s1, q, s2, w) => { const d = parseDue(q || w); if (d) { it.due = d; return ' '; } return m; });
  s = s.replace(/(\s)\*([a-z]+)(?=\s)/giu, (m, sp, w) => { const r = REPEAT_ALIAS[w.toLowerCase()]; if (r) { it.repeat = r; return ' '; } return m; });
  // natural "every …" phrases (kept in the title)
  if (!it.repeat) {
    const m = /\bevery\s+(other\s+week|2\s+weeks|weekday|day|week|month|quarter|year|(mon|tue|wed|thu|fri|sat|sun)[a-z]*)\b/i.exec(s);
    if (m) {
      const w = m[1].toLowerCase();
      if (/other|2\s/.test(w)) it.repeat = 'biweekly';
      else if (m[2]) { it.repeat = 'weekly'; if (!it.due) it.due = parseDue(m[2]); }
      else it.repeat = REPEAT_ALIAS[w] || '';
    }
  }
  it.title = s.replace(/\s+/g, ' ').trim();
}
function cleanTitle(it) {
  let t = it.title, m, changed = false;
  if ((m = /^(?:please\s+)?remind\s+me\s+(?:to\s+|about\s+|that\s+)?/i.exec(t))) {
    t = t.slice(m[0].length); changed = true; const ty = matchType('Reminder'); if (ty && !it.typeId) it.typeId = ty.id;
  }
  if ((m = /^(\p{L}[\p{L} \-]{1,24}?)\s*[:\-–—]\s+/u.exec(t))) {
    const ty = matchType(m[1].trim());
    if (ty) { t = t.slice(m[0].length); changed = true; if (!it.typeId) it.typeId = ty.id; }
    else if (/^(todo|to do|task|tbd|action)$/i.test(m[1].trim())) { t = t.slice(m[0].length); changed = true; }
  }
  if (changed && t) t = t.charAt(0).toUpperCase() + t.slice(1);
  it.title = (t || it.title).trim();
}
function autoSort(it, st) {
  const text = (it.title + ' ' + (it.notes || '') + ' ' + it.tags.join(' ')).toLowerCase();
  const root = it.areaId || null;
  let best = null, bestScore = -1;
  for (const a of st.ctx.all()) {
    if (root && (a.id === root || !st.ctx.inSub(a.id, root))) continue;
    const kws = kwList(a.keywords); if (a.name.length >= 3) kws.push(a.name.toLowerCase());
    for (const kw of kws) {
      if (kwFind(text, kw) >= 0) { const sc = st.ctx.depth(a.id) * 1000 + kw.length; if (sc > bestScore) { bestScore = sc; best = a; } }
    }
  }
  if (best) { it.areaId = best.id; it.autoSorted = true; }
  if (!it.typeId) {
    let bt = null, bi = Infinity, bl = 0;
    for (const ty of D.types) for (const kw of kwList(ty.keywords)) { const i = kwFind(text, kw); if (i >= 0 && (i < bi || (i === bi && kw.length > bl))) { bt = ty; bi = i; bl = kw.length; } }
    if (bt) it.typeId = bt.id;
  }
}

/* ---------- main entry ---------- */
function defaultImportOpts() {
  return { mode: 'auto', group: 'smart', tokens: true, keywords: true, create: true, base: cur(), defaultType: '', source: '', dup: 'merge', nest: 'subnotes' };
}
function parseImport(text, opt) {
  text = String(text || '').replace(/\r\n?/g, '\n');
  const st = makeState(opt);
  const mode = opt.mode === 'auto' ? detectMode(text) : opt.mode;
  if (mode === 'sheet') parseSheetInto(text, st);
  else if (mode === 'blocks') parseBlocksInto(text, st);
  else parseLinesInto(toRows(text), st);
  for (const it of st.items) {
    if (opt.tokens) applyTokens(it, st);
    cleanTitle(it);
    if (opt.keywords) autoSort(it, st);
    if (!it.typeId && opt.defaultType) it.typeId = opt.defaultType;
    if (!it.title) it.title = 'Untitled';
  }
  // duplicates (repeated reminders etc.)
  const existing = new Map();
  for (const t of D.tasks) { const k = dupKey(t.title); if (!k) continue; const e = existing.get(k); if (!e || (isDone(e) && !isDone(t))) existing.set(k, t); }
  const seenBatch = new Map(); let dups = 0;
  st.items.forEach((it, i) => {
    const k = dupKey(it.title); if (!k) return;
    if (existing.has(k)) { it.dupOf = existing.get(k).id; dups++; }
    else if (seenBatch.has(k)) { it.dupIdx = seenBatch.get(k); dups++; }
    else seenBatch.set(k, i);
  });
  return { items: st.items, ctx: st.ctx, mode, dups };
}
function mergeInto(target, it) {
  target.seen = (target.seen || 1) + (it.seen || 1);
  if (it.notes && !String(target.notes || '').includes(it.notes)) target.notes = (target.notes ? target.notes + '\n\n' : '') + it.notes;
  const have = new Set(target.subnotes.map(s => norm(s.text)));
  it.subnotes.forEach(s => { if (!have.has(norm(s.text))) target.subnotes.push({ id: uid('s'), text: s.text, done: !!s.done, note: '' }); });
  target.tags = [...new Set([...(target.tags || []), ...it.tags])];
  if (!target.due && it.due) target.due = it.due;
  if (!target.duration && it.duration) target.duration = it.duration;
  if (!target.repeat && it.repeat) target.repeat = it.repeat;
  if (it.priorityId && (PRANK[it.priorityId] ?? 99) < prank(target)) target.priorityId = it.priorityId;
  if (!target.areaId && it.areaId) target.areaId = it.areaId;
  if (!target.typeId && it.typeId) target.typeId = it.typeId;
  if (isDone(target) && !it.done) target.statusId = defaultStatus();
  target.updated = now();
}
/** writes parsed items into the data (call inside mutate) */
function commitParsed(res, opt, presetKeys = []) {
  res.ctx.commit(); reindex();
  const out = { created: [], merged: 0, skipped: 0 };
  const byIdx = {}, ext = new Map(), links = []; let ord = maxOrder();
  res.items.forEach((it, i) => {
    if (it.exclude) return;
    const dup = it.dupOf || it.dupIdx != null;
    if (dup && opt.dup === 'skip') { out.skipped++; return; }
    if (dup && opt.dup === 'merge') { const tgt = it.dupOf ? TASK[it.dupOf] : byIdx[it.dupIdx]; if (tgt) { mergeInto(tgt, it); out.merged++; if (it.extId) ext.set(it.extId, tgt); return; } }
    const asKids = opt.nest === 'subtasks' && it.subnotes.length;
    const t = newTask({
      title: it.title, notes: it.notes || '', subnotes: asKids ? [] : it.subnotes.map(s => ({ id: uid('s'), text: s.text, done: !!s.done, note: s.notes || '' })), color: it.color || '',
      areaId: it.areaId || null, typeId: it.typeId || null, priorityId: it.priorityId || null, duration: it.duration || null, due: it.due || null,
      repeat: it.repeat || '', tags: [...new Set(it.tags)], source: opt.source || it.source || '', custom: it.custom || {}, seen: it.seen || 1, order: ++ord,
    });
    if (it.statusId && ST[it.statusId]) t.statusId = it.statusId; else if (it.done) t.statusId = doneStatus();
    presetKeys.forEach(k => k && applyKey(t, k));
    D.tasks.push(t); byIdx[i] = t; out.created.push(t);
    if (it.extId) ext.set(it.extId, t);
    if (it.extParent) links.push([t, it.extParent]);
    if (asKids) {
      // indented lines → a tree of subtasks (deeper than the limit stays as subnotes)
      const stack = [{ indent: -1, task: t, depth: 0 }];
      for (const s of it.subnotes) {
        const ind = s.indent ?? 1;
        while (stack.length > 1 && stack[stack.length - 1].indent >= ind) stack.pop();
        const host = stack[stack.length - 1];
        if (host.depth >= MAX_NEST) { host.task.subnotes.push({ id: uid('s'), text: s.text, done: !!s.done, note: '' }); continue; }
        const ci = { title: s.text, notes: s.notes || '', subnotes: [], tags: [], custom: {} };
        if (opt.tokens) applyTokens(ci, { ctx: res.ctx, opt });
        cleanTitle(ci);
        const c = newTask({ title: ci.title || 'Untitled', notes: ci.notes, parentId: host.task.id, areaId: t.areaId, typeId: ci.typeId || null, priorityId: ci.priorityId || null, due: ci.due || null, duration: ci.duration || null, repeat: ci.repeat || '', tags: [...new Set(ci.tags)], source: t.source, order: ++ord, statusId: s.done ? doneStatus() : defaultStatus() });
        D.tasks.push(c); out.kids = (out.kids || 0) + 1;
        stack.push({ indent: ind, task: c, depth: host.depth + 1 });
      }
    }
  });
  // spreadsheet rows that name a parent by ID
  if (links.length) {
    reindex();
    for (const [t, pid] of links) { const p = ext.get(pid) || TASK[pid]; if (p && p !== t && canNest(t, p)) { t.parentId = p.id; reindex(); } }
    D.tasks.forEach(t => { if (t.parentId) setAreaDeep(t, rootOf(t).areaId); });
  }
  return out;
}
/** one-step add from the quick bar, inline column inputs and text dropped on the board */
function quickAddText(text, presetKeys = [], opts = {}) {
  const opt = { ...defaultImportOpts(), dup: 'keep', ...opts };
  const res = parseImport(text, opt);
  if (!res.items.length) return null;
  let out;
  mutate(res.items.length > 1 ? `Add ${res.items.length} tasks` : 'Add task', () => { out = commitParsed(res, opt, presetKeys); });
  return out;
}
