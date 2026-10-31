/* ============ HatRack — board, filters, selection, drag & drop, clipboard ============ */

let sel = new Set();
let lastClicked = null, hoverCell = null, drag = null, clip = null, ph = null;

const SORTS = [['manual', 'Manual'], ['priority', 'Priority'], ['due', 'Due date'], ['duration', 'Shortest first'], ['created', 'Newest first'], ['title', 'A–Z']];

/* ---------- scope & filters ---------- */
function scopeTasks() { const c = cur(); return c ? D.tasks.filter(t => inSubtree(t.areaId, c)) : D.tasks.slice(); }
function passFilters(t) {
  const f = U.f;
  if (f.q) {
    const hay = (t.title + ' ' + t.notes + ' ' + t.tags.join(' ') + ' ' + t.subnotes.map(s => s.text + ' ' + (s.note || '')).join(' ') + ' ' + t.source + ' ' + pathStr(t.areaId)).toLowerCase();
    if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w))) return false;
  }
  if (f.type && (f.type === 'none' ? T[t.typeId] : t.typeId !== f.type)) return false;
  if (f.pri && (f.pri === 'none' ? PR[t.priorityId] : t.priorityId !== f.pri)) return false;
  if (f.status === 'open') { if (isDone(t)) return false; }
  else if (f.status && f.status !== 'all' && t.statusId !== f.status) return false;
  if (f.due === 'rep') { if (!t.repeat) return false; }
  else if (f.due && dueBucket(t) !== f.due) return false;
  return true;
}
const visibleTasks = () => scopeTasks().filter(passFilters);
const filtersActive = () => !!(U.f.q || U.f.type || U.f.pri || (U.f.status && U.f.status !== 'open') || U.f.due);
function sortTasks(list, how = U.sort) {
  const by = {
    manual: (a, b) => a.order - b.order,
    priority: (a, b) => prank(a) - prank(b) || (a.due || '9').localeCompare(b.due || '9') || a.order - b.order,
    due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999') || prank(a) - prank(b) || a.order - b.order,
    duration: (a, b) => (a.duration || 1e9) - (b.duration || 1e9) || a.order - b.order,
    created: (a, b) => b.created - a.created,
    title: (a, b) => a.title.localeCompare(b.title),
  }[how] || ((a, b) => a.order - b.order);
  return list.sort(by);
}

/* ---------- columns ---------- */
function groupOptions(forLanes) {
  const o = [['area', levelName(depthOf(cur()) + 1)], ['type', 'Type'], ['priority', 'Priority'], ['status', 'Status'], ['duration', 'Duration'], ['due', 'Due date']];
  D.fields.filter(f => f.kind === 'select').forEach(f => o.push(['cf:' + f.id, f.name]));
  return forLanes ? [['none', 'None'], ...o.filter(x => x[0] !== U.group)] : o;
}
function fieldCols(field) {
  const c = cur();
  switch (field) {
    case 'area': {
      const cols = [{ key: c ? 'areaself|' + c : 'area|', label: c ? `${A[c].name} — not yet sorted` : 'Unsorted', color: c ? areaColor(c) : null, inbox: true }];
      kids(c).forEach(a => cols.push({ key: 'area|' + a.id, label: a.name, color: areaColor(a.id), areaId: a.id, drill: true, subCount: kids(a.id).length }));
      return cols;
    }
    case 'type': return [...D.types.map(x => ({ key: 'type|' + x.id, label: x.name, icon: x.icon, color: x.color })), { key: 'type|', label: 'No type', inbox: true }];
    case 'priority': return [...D.priorities.map(x => ({ key: 'priority|' + x.id, label: x.name, color: x.color })), { key: 'priority|', label: 'No priority', inbox: true }];
    case 'status': return D.statuses.map(x => ({ key: 'status|' + x.id, label: x.name, color: x.color }));
    case 'duration': return [{ key: 'duration|', label: 'Not estimated', inbox: true }, ...durPresets().map((m, i, arr) => ({ key: 'duration|' + m, label: i === arr.length - 1 && arr.length > 1 ? fmtDur(m) + '+' : fmtDur(m) }))];
    case 'due': return DUE_COLS.map(([k, l]) => ({ key: 'due|' + k, label: l, nodrop: k === 'overdue', color: k === 'overdue' ? 'var(--danger)' : k === 'today' ? 'var(--hl)' : null, inbox: k === 'none' }));
  }
  if (field.startsWith('cf:')) {
    const f = D.fields.find(x => x.id === field.slice(3)); if (!f) return [];
    return [...(f.options || []).map(o => ({ key: field + '|' + o, label: o })), { key: field + '|', label: `No ${f.name}`, inbox: true }];
  }
  return [];
}
function keyOf(t, field) {
  switch (field) {
    case 'area': {
      const c = cur();
      if (!c) { const top = topOf(t.areaId); return 'area|' + (top ? top.id : ''); }
      if (t.areaId === c) return 'areaself|' + c;
      const anc = ancestors(t.areaId); const i = anc.findIndex(a => a.id === c);
      return i < 0 ? null : 'area|' + anc[i + 1].id;
    }
    case 'type': return 'type|' + (T[t.typeId] ? t.typeId : '');
    case 'priority': return 'priority|' + (PR[t.priorityId] ? t.priorityId : '');
    case 'status': return 'status|' + (ST[t.statusId] ? t.statusId : defaultStatus());
    case 'duration': return 'duration|' + (durBucket(t.duration) ?? '');
    case 'due': return 'due|' + dueBucket(t);
  }
  if (field.startsWith('cf:')) {
    const f = D.fields.find(x => x.id === field.slice(3)); const v = t.custom?.[f?.id];
    return field + '|' + (f && (f.options || []).includes(v) ? v : '');
  }
  return null;
}
/** apply a column/lane key to a task. Returns a message (e.g. repeat rescheduled) or null. */
function applyKey(t, key) {
  const i = key.indexOf('|'); if (i < 0) return null;
  const f = key.slice(0, i), v = key.slice(i + 1);
  let msg = null;
  switch (f) {
    case 'area': if (!v) setAreaDeep(t, null); else if (!inSubtree(t.areaId, v)) setAreaDeep(t, v); break;
    case 'areaself': setAreaDeep(t, v || null); break;
    case 'type': t.typeId = v || null; break;
    case 'priority': t.priorityId = v || null; break;
    case 'status': msg = setStatus(t, v || defaultStatus()); break;
    case 'duration': t.duration = v ? +v : null; break;
    case 'due': if (v !== 'overdue') t.due = dueForBucket(v); break;
    default:
      if (f.startsWith('cf:')) { const id = f.slice(3); t.custom ||= {}; if (v) t.custom[id] = v; else delete t.custom[id]; }
  }
  t.updated = now();
  return msg;
}
function keyLabel(key) {
  if (!key) return '';
  const i = key.indexOf('|'); const f = key.slice(0, i), v = key.slice(i + 1);
  if (f === 'area' || f === 'areaself') return v ? pathStr(v) : 'Unsorted';
  if (f === 'type') return T[v]?.name || 'No type';
  if (f === 'priority') return PR[v]?.name || 'No priority';
  if (f === 'status') return ST[v]?.name || '';
  if (f === 'duration') return v ? fmtDur(+v) : 'Not estimated';
  if (f === 'due') return (DUE_COLS.find(d => d[0] === v) || ['', ''])[1];
  if (f.startsWith('cf:')) { const fd = D.fields.find(x => x.id === f.slice(3)); return `${fd?.name || 'Field'}: ${v || 'none'}`; }
  return '';
}
const canAddCol = () => ['area', 'type', 'priority', 'status', 'duration'].includes(U.group) || U.group.startsWith('cf:');
function addColLabel() {
  if (U.group === 'area') return levelName(depthOf(cur()) + 1);
  if (U.group.startsWith('cf:')) return 'option';
  return { type: 'type', priority: 'priority', status: 'status', duration: 'duration' }[U.group] || 'column';
}

/* ---------- toolbar ---------- */
function crumbsHTML() {
  const c = cur(); const anc = ancestors(c);
  let h = `<button data-drill="" class="${!c ? 'here' : ''}">Whole rack</button>`;
  anc.forEach((a, i) => { h += `<span class="sep">›</span><button data-drill="${a.id}" class="${i === anc.length - 1 ? 'here' : ''}"><span class="dot" style="background:${areaColor(a.id) || 'var(--muted)'}"></span>${esc(a.name)}</button>`; });
  return h;
}
const opt = (v, l, curv) => `<option value="${esc(v)}"${String(v) === String(curv ?? '') ? ' selected' : ''}>${esc(l)}</option>`;
function renderToolbar() {
  const tb = $('#toolbar');
  if (U.view === 'settings') { tb.innerHTML = `<nav class="crumbs"><button data-view="board">‹ Back to the board</button></nav><span class="muted sm">Changes save automatically.</span>`; return; }
  const f = U.f;
  let h = `<nav class="crumbs" aria-label="Scope">${crumbsHTML()}</nav>`;
  if (U.view === 'board') {
    h += `<div class="tb-group">
      <label>Columns <select class="inp" id="tb-group">${groupOptions(false).map(o => opt(o[0], o[1], U.group)).join('')}</select></label>
      <label>Rows <select class="inp" id="tb-lanes">${groupOptions(true).map(o => opt(o[0], o[1], U.lanes)).join('')}</select></label>
      <label>Order <select class="inp" id="tb-sort">${SORTS.map(o => opt(o[0], o[1], U.sort)).join('')}</select></label></div>`;
  }
  if (U.view !== 'reports') {
    h += `<span class="tb-sep"></span><button class="btn sm tb-ftoggle" id="tb-ftoggle" aria-expanded="false">Search & filter${filtersActive() ? ' •' : ''}</button><div class="tb-group tb-filters">
      <input class="inp tb-search" id="tb-q" type="search" placeholder="Search tasks" value="${esc(f.q)}" aria-label="Search tasks">
      <select class="inp" id="tb-type" aria-label="Type filter">${opt('', 'Type: any', f.type)}${D.types.map(x => opt(x.id, x.name, f.type)).join('')}${opt('none', 'No type', f.type)}</select>
      <select class="inp" id="tb-pri" aria-label="Priority filter">${opt('', 'Priority: any', f.pri)}${D.priorities.map(x => opt(x.id, x.name, f.pri)).join('')}${opt('none', 'No priority', f.pri)}</select>
      <select class="inp" id="tb-status" aria-label="Status filter">${opt('open', 'Open', f.status)}${opt('all', 'All statuses', f.status)}${D.statuses.map(x => opt(x.id, x.name, f.status)).join('')}</select>
      <select class="inp" id="tb-due" aria-label="Date filter">${opt('', 'Due: any', f.due)}${DUE_COLS.map(d => opt(d[0], d[1], f.due)).join('')}${opt('rep', 'Repeating', f.due)}</select>
      ${filtersActive() ? '<button class="btn ghost sm" id="tb-clear">Clear filters</button>' : ''}</div>`;
  }
  if (U.view === 'board') h += `<span class="spacer"></span><button class="btn sm" id="tb-opts" aria-haspopup="menu" title="Card size and drag behaviour">Options${U.density === 'compact' || U.copyDrop ? ' •' : ''} ▾</button>`;
  tb.innerHTML = h;
}
function onToolbarInput(e) {
  const id = e.target.id; const v = e.target.value;
  const set = (k, val) => { U.f[k] = val; saveUI(); renderView(); renderSelBar(); if (e.type === 'change') renderToolbar(); };
  if (id === 'tb-q') { U.f.q = v; saveUI(); renderView(); return; }
  if (e.type !== 'change') return;
  if (id === 'tb-group') { U.group = v; if (U.lanes === v) U.lanes = 'none'; saveUI(); renderAll(); }
  else if (id === 'tb-lanes') { U.lanes = v; saveUI(); renderAll(); }
  else if (id === 'tb-sort') { U.sort = v; saveUI(); renderView(); }
  else if (id === 'tb-type') set('type', v);
  else if (id === 'tb-pri') set('pri', v);
  else if (id === 'tb-status') set('status', v);
  else if (id === 'tb-due') set('due', v);
}
function onToolbarClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.drill !== undefined) return drill(b.dataset.drill || null);
  if (b.dataset.view) return setView(b.dataset.view);
  if (b.id === 'tb-ftoggle') { const on = $('#toolbar').classList.toggle('show-f'); b.setAttribute('aria-expanded', String(on)); return; }
  if (b.id === 'tb-clear') { U.f = { ...UI_DEFAULT.f }; saveUI(); renderAll(); }
  if (b.id === 'tb-opts') popMenu(b, [
    { hd: 'Cards' },
    { label: `${U.density === 'compact' ? '✓ ' : '\u2003'}Compact — titles only`, onPick: () => { U.density = U.density === 'compact' ? 'cozy' : 'compact'; saveUI(); renderAll(); } },
    { label: '\u2003Expand every card', onPick: () => { boardRoots().forEach(t => { if (extrasLabel(t)) U.exp[t.id] = true; }); saveUI(); renderView(); } },
    { label: '\u2003Collapse every card', onPick: () => { U.exp = {}; saveUI(); renderView(); } },
    { hd: 'Dragging' },
    { label: `${!U.copyDrop ? '✓ ' : '\u2003'}Dropping moves the card`, onPick: () => { U.copyDrop = false; saveUI(); renderToolbar(); } },
    { label: `${U.copyDrop ? '✓ ' : '\u2003'}Dropping copies the card`, onPick: () => { U.copyDrop = true; saveUI(); renderToolbar(); toast('Dropping now copies cards. Tip: hold Alt/Option while dropping to copy just once.'); } },
  ]);
}
function drill(id) { U.cursor = id && A[id] ? id : null; saveUI(); sel.clear(); renderAll(); $('#view').scrollTo({ left: 0, top: 0 }); }

/* ---------- board render ---------- */
function emptyStateHTML() {
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  return `<div class="empty"><h2>Hang up your first hat</h2>
    <p>HatRack takes the long to-do lists you collect everywhere — notes apps, emails, voice memos, sticky notes — and sorts them into the businesses, projects and parts of life they belong to. Then it exports each sector to the task app you actually use.</p>
    <div class="acts"><button class="btn primary" data-act="import">Paste your notes</button><button class="btn" data-act="setup">Set up your groups</button><button class="btn" data-act="sample">Explore with sample data</button></div>
    <p class="muted sm" style="margin:16px 0 0">New here? <button class="linkish" data-act="guide">Take the visual guide</button>. Everything stays in this browser — nothing is uploaded anywhere.</p>
    ${standalone ? '<p class="note-line">Opened from your home screen? This app keeps its own copy of your data. Move tasks in with Configure → Data → Restore.</p>' : ''}</div>`;
}
/** top-level cards to show: visible tasks, plus the parents of any visible subtask */
function boardRoots() {
  const roots = new Map();
  visibleTasks().forEach(t => { const r = rootOf(t); roots.set(r.id, r); });
  return sortTasks([...roots.values()]);
}
function renderBoard() {
  const view = $('#view');
  if (!D.tasks.length && !D.areas.length) { view.innerHTML = emptyStateHTML(); return; }
  const cols = fieldCols(U.group);
  const laneField = U.lanes !== 'none' && U.lanes !== U.group ? U.lanes : null;
  const lanes = laneField ? fieldCols(laneField) : [{ key: '', label: '' }];
  const cells = new Map(), tot = {};
  for (const t of boardRoots()) {
    const ck = keyOf(t, U.group); if (ck == null) continue;
    const lk = laneField ? keyOf(t, laneField) : ''; if (lk == null) continue;
    const k = lk + '::' + ck; (cells.get(k) || cells.set(k, []).get(k)).push(t);
    const x = tot[ck] ||= { n: 0, min: 0 }; x.n++;
    x.min += [t, ...taskDescendants(t)].reduce((m, c) => m + (isDone(c) ? 0 : +c.duration || 0), 0);
  }
  const addCol = canAddCol();
  let kIdx = 0;
  const head = cols.map(c => colHeadHTML(c, tot[c.key] || { n: 0, min: 0 }, c.nodrop ? '' : (++kIdx <= 9 ? kIdx : ''))).join('')
    + (addCol ? `<div class="col-add"><button class="btn" data-addcol>+ Add ${esc(addColLabel())}</button></div>` : '');
  let body = '';
  for (const lane of lanes) {
    if (laneField) {
      const n = cols.reduce((s, c) => s + (cells.get(lane.key + '::' + c.key) || []).length, 0);
      body += `<section class="lane"><div class="lane-head" style="--c:${lane.color || 'var(--muted)'}"><span class="sw"></span>${lane.icon ? esc(lane.icon) + ' ' : ''}${esc(lane.label)} <span class="muted">${n}</span></div>`;
    }
    body += '<div class="board-row">' + cols.map(c => {
      const list = cells.get(lane.key + '::' + c.key) || [];
      return `<div class="cell${c.nodrop ? ' nodrop' : ''}" data-col="${esc(c.key)}" data-lane="${esc(lane.key)}" aria-label="${esc(c.label)}">${list.map(t => cardHTML(t, c)).join('')}${c.nodrop ? '' : '<button class="add-inline" data-addin>+ Add</button>'}</div>`;
    }).join('') + (addCol ? '<div></div>' : '') + '</div>';
    if (laneField) body += '</section>';
  }
  view.innerHTML = `<div class="board density-${U.density}" id="board" style="--ncols:${cols.length + (addCol ? 1 : 0)}"><div class="board-head board-row">${head}</div>${body}</div>`;
  markClamps(view);
}
/** reveal "Show all" on cards whose title is cut off at three lines */
function markClamps(root) {
  requestAnimationFrame(() => $$('.clamp', root).forEach(el => {
    const host = el.closest('[data-clamphost]'); if (!host) return;
    const btn = host.querySelector(':scope [data-more]'); if (!btn || !btn.hidden) return;
    if (el.scrollHeight > el.clientHeight + 2) { btn.hidden = false; }
  }));
}
function colHeadHTML(c, tot, k) {
  const name = c.drill
    ? `<button class="col-name drill" data-drill="${c.areaId}" title="Open ${esc(c.label)}">${esc(c.label)}</button>`
    : `<span class="col-name">${c.icon ? esc(c.icon) + ' ' : ''}${esc(c.label)}</span>`;
  const meta = [];
  if (c.subCount) meta.push(`<span>${plural(c.subCount, levelName(depthOf(c.areaId) + 1).toLowerCase())} ›</span>`);
  if (tot.min) meta.push(`<span>${fmtHours(tot.min)} estimated</span>`);
  return `<div class="col-head${c.inbox ? ' inbox' : ''}" style="--c:${c.color || 'var(--line)'}">
    <div class="col-title">${name}<span class="col-n">${tot.n}</span></div>
    <div class="col-meta">${meta.join('') || '&nbsp;'}</div>
    <div class="col-tools">${k ? `<kbd class="col-key" title="Press ${k} to move selected tasks here">${k}</kbd>` : ''}<button class="icon-btn sm" data-colmenu="${esc(c.key)}" aria-label="${esc(c.label)} actions">⋯</button></div></div>`;
}
const SHORT_REPEAT = { daily: 'daily', weekdays: 'weekdays', weekly: 'weekly', biweekly: '2 wks', monthly: 'monthly', quarterly: 'quarterly', yearly: 'yearly' };
const linkify = html => html.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
function duePill(t) {
  if (!t.due) return '';
  const b = dueBucket(t); const over = b === 'overdue' && !isDone(t);
  return `<span class="pill${over ? ' over' : b === 'today' ? ' today' : ''}" title="Due ${esc(t.due)}">${over ? 'Overdue: ' : ''}${esc(fmtDate(t.due))}</span>`;
}
function extrasLabel(t) {
  const desc = taskDescendants(t), x = [];
  if (desc.length) { const d = desc.filter(isDone).length; x.push(`${plural(desc.length, 'subtask')}${d ? ` (${d} done)` : ''}`); }
  if (t.subnotes.length) x.push(plural(t.subnotes.length, 'subnote'));
  if (t.notes) x.push('notes');
  return x.join(' · ');
}
function cardHTML(t, col) {
  const ty = T[t.typeId], pr = PR[t.priorityId], st = ST[t.statusId];
  const base = U.group === 'area' ? (col.areaId || cur()) : cur();
  const anc = ancestors(t.areaId); const bi = base ? anc.findIndex(a => a.id === base) : -1;
  const rel = anc.slice(bi + 1).map(a => a.name).join(' / ');
  const p = [];
  if (pr && U.group !== 'priority') p.push(`<span class="pill" style="--c:${pr.color}"><span class="d"></span>${esc(pr.name)}</span>`);
  if (st && U.group !== 'status' && t.statusId !== defaultStatus()) p.push(`<span class="pill" style="--c:${st.color}"><span class="d"></span>${esc(st.name)}</span>`);
  if (t.due) p.push(duePill(t));
  if (t.repeat) p.push(`<span class="pill" title="${esc(REPEAT_LABEL[t.repeat])}">↻ ${SHORT_REPEAT[t.repeat]}</span>`);
  if (t.duration && U.group !== 'duration') p.push(`<span class="pill" title="Estimated time">◷ ${fmtDur(t.duration)}</span>`);
  if (t.attachments.length) p.push(`<span class="pill" title="Attachments">📎 ${t.attachments.length}</span>`);
  if ((t.seen || 1) > 1) p.push(`<span class="pill seen" title="You noted this ${t.seen} times">×${t.seen}</span>`);
  D.fields.filter(f => f.kind === 'select' && U.group !== 'cf:' + f.id && t.custom?.[f.id]).forEach(f => p.push(`<span class="pill">${esc(t.custom[f.id])}</span>`));
  t.tags.slice(0, 3).forEach(g => p.push(`<span class="pill">#${esc(g)}</span>`));
  const on = sel.has(t.id), open = !!U.exp[t.id], extras = extrasLabel(t);
  const desc = open ? taskDescendants(t) : [];
  const more = `<button class="card-more" data-more aria-expanded="${open}"${extras || open ? '' : ' hidden'}><span class="chev" aria-hidden="true">${open ? '▾' : '▸'}</span>${open ? 'Show less' : esc(extras || 'Show all')}</button>`;
  const body = open ? `<div class="card-body">
      ${t.notes ? `<div class="cb-notes">${linkify(esc(t.notes))}</div>` : ''}
      ${t.subnotes.length ? `<div class="cb-subs">${t.subnotes.map(s => `<label class="cb-sub${s.done ? ' done' : ''}"><input type="checkbox" data-subtoggle="${s.id}" ${s.done ? 'checked' : ''}><span>${esc(s.text)}</span></label>`).join('')}</div>` : ''}
      ${desc.length ? `<div class="subtree" role="list">${desc.map(c => subcardHTML(c, taskDepth(c) - taskDepth(t))).join('')}</div>` : ''}
      <button class="add-sub" data-addsub>+ Subtask</button></div>` : '';
  return `<article class="card${on ? ' is-sel' : ''}${isDone(t) ? ' is-done' : ''}${open ? ' is-open' : ''}" draggable="true" data-id="${t.id}" data-clamphost style="--tag:${areaColor(t.areaId) || 'var(--line)'};${t.color ? `--cbg:${tintVar(t.color)}` : ''}" ${t.color ? `data-bg="${t.color}"` : ''} tabindex="0">
    <button class="card-check" data-check aria-label="Select" tabindex="-1">${on ? '✓' : ''}</button>
    <div class="card-title clamp">${ty && ty.icon ? `<span class="ty" title="${esc(ty.name)}">${esc(ty.icon)}</span>` : ''}${esc(t.title)}</div>
    ${rel ? `<div class="card-path">${esc(rel)}</div>` : ''}${p.length ? `<div class="card-meta">${p.join('')}</div>` : ''}${more}${body}</article>`;
}
function subcardHTML(c, d) {
  const ty = T[c.typeId], pr = PR[c.priorityId], n = childrenOf(c.id).length;
  const bits = [];
  if (pr) bits.push(`<span class="pill" style="--c:${pr.color}"><span class="d"></span>${esc(pr.name)}</span>`);
  if (c.due) bits.push(duePill(c));
  if (c.duration) bits.push(`<span class="pill">◷ ${fmtDur(c.duration)}</span>`);
  if (c.repeat) bits.push(`<span class="pill">↻ ${SHORT_REPEAT[c.repeat]}</span>`);
  if (c.notes || c.subnotes.length) bits.push(`<span class="pill" title="Has notes or subnotes">✎</span>`);
  return `<div class="subcard${isDone(c) ? ' is-done' : ''}${sel.has(c.id) ? ' is-sel' : ''}" role="listitem" draggable="true" data-id="${c.id}" style="--d:${Math.max(0, d - 1)};${c.color ? `--scbg:${tintVar(c.color)}` : ''}" ${c.color ? `data-bg="${c.color}"` : ''}>
    <input type="checkbox" class="sc-done" data-scdone ${isDone(c) ? 'checked' : ''} aria-label="Mark “${esc(c.title)}” done">
    <div class="sc-main"><div class="sc-title clamp">${ty && ty.icon ? esc(ty.icon) + ' ' : ''}${esc(c.title)}${n ? ` <span class="muted">· ${plural(taskDescendants(c).length, 'subtask')}</span>` : ''}</div>${bits.length ? `<div class="card-meta">${bits.join('')}</div>` : ''}</div></div>`;
}

/* ---------- board interactions ---------- */
function onViewClick(e) {
  const t = e.target;
  const act = t.closest('[data-act]');
  if (act) { const a = act.dataset.act; if (a === 'import') openImport(); else if (a === 'setup') { U.settingsTab = 'hierarchy'; setView('settings'); } else if (a === 'sample') loadSample(); else if (a === 'guide') openGuide(); return; }
  if (U.view !== 'board') return;
  const dr = t.closest('[data-drill]'); if (dr && $('#board')?.contains(dr)) return drill(dr.dataset.drill);
  const cm = t.closest('[data-colmenu]'); if (cm) return colMenu(cm, cm.dataset.colmenu);
  if (t.closest('[data-addcol]')) return addColumn();
  const ai = t.closest('[data-addin]'); if (ai) return startInlineAdd(ai);
  if (t.closest('a, .cb-sub, [data-scdone], .add-sub-inp')) return;
  const mo = t.closest('[data-more]'); if (mo) return toggleExp(mo.closest('[data-id]').dataset.id);
  const as = t.closest('[data-addsub]'); if (as) return startSubAdd(as.closest('.card').dataset.id);
  const sc = t.closest('.subcard');
  if (sc) {
    const id = sc.dataset.id;
    if (e.metaKey || e.ctrlKey) { toggleSel(id); return; }
    lastClicked = id; openEditor(id); return;
  }
  const card = t.closest('.card');
  if (card) {
    const id = card.dataset.id;
    if (t.closest('[data-check]') || e.metaKey || e.ctrlKey) { toggleSel(id); return; }
    if (e.shiftKey && lastClicked) { rangeSel(lastClicked, id); return; }
    lastClicked = id; openEditor(id);
  }
}
function onBoardChange(e) {
  if (U.view !== 'board') return;
  const el = e.target;
  if (el.matches('[data-subtoggle]')) {
    const t = TASK[el.closest('.card').dataset.id]; const s = t?.subnotes.find(x => x.id === el.dataset.subtoggle);
    if (s) mutate('Subnote', () => { s.done = el.checked; t.updated = now(); });
  } else if (el.matches('[data-scdone]')) {
    const c = TASK[el.closest('.subcard').dataset.id]; if (!c) return; let msg;
    mutate(el.checked ? 'Mark done' : 'Reopen', () => { msg = setStatus(c, el.checked ? doneStatus() : defaultStatus()); c.updated = now(); });
    if (msg) toast(msg, { undo: true });
  }
}
function onViewKey(e) {
  const card = e.target.closest?.('.card'); if (!card || e.target !== card) return;
  if (e.key === 'Enter') { e.preventDefault(); openEditor(card.dataset.id); }
  else if (e.key === ' ') { e.preventDefault(); toggleSel(card.dataset.id); }
  else if (e.key === 'ArrowRight' && !U.exp[card.dataset.id]) { e.preventDefault(); toggleExp(card.dataset.id, true); }
  else if (e.key === 'ArrowLeft' && U.exp[card.dataset.id]) { e.preventDefault(); toggleExp(card.dataset.id, true); }
}
function toggleExp(id, refocus = false) {
  if (U.exp[id]) delete U.exp[id]; else U.exp[id] = true;
  saveUI(); renderView();
  if (refocus) $(`.card[data-id="${CSS.escape(id)}"]`)?.focus();
}
function startInlineAdd(btn) {
  const cell = btn.closest('.cell'); const col = cell.dataset.col, lane = cell.dataset.lane;
  const inp = document.createElement('input');
  inp.className = 'inp inline-inp'; inp.placeholder = 'Task name — shortcuts work: !high ^fri ~30m';
  btn.replaceWith(inp); inp.focus();
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && inp.value.trim()) {
      const out = quickAddText(inp.value, [col, lane].filter(Boolean), { base: cur() });
      if (out && out.created[0]) toast(`Added “${out.created[0].title}”`, { undo: true });
      const again = $(`.cell[data-col="${CSS.escape(col)}"][data-lane="${CSS.escape(lane)}"] [data-addin]`);
      if (again) startInlineAdd(again);
    } else if (e.key === 'Escape') { e.stopPropagation(); renderView(); }
  });
  inp.addEventListener('blur', () => setTimeout(() => { if (inp.isConnected && !inp.value.trim() && document.activeElement !== inp) renderView(); }, 120));
}
/** inline "+ Subtask" inside an expanded card */
function startSubAdd(parentId) {
  if (!U.exp[parentId]) { U.exp[parentId] = true; saveUI(); renderView(); }
  const btn = $(`.card[data-id="${CSS.escape(parentId)}"] [data-addsub]`); if (!btn) return;
  const inp = document.createElement('input');
  inp.className = 'inp add-sub-inp'; inp.placeholder = 'Subtask — Enter to add, Esc to stop';
  btn.replaceWith(inp); inp.focus();
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && inp.value.trim()) { const c = addSubtaskFromText(TASK[parentId], inp.value); if (c) startSubAdd(parentId); }
    else if (e.key === 'Escape') { e.stopPropagation(); renderView(); }
  });
  inp.addEventListener('blur', () => setTimeout(() => { if (inp.isConnected && !inp.value.trim() && document.activeElement !== inp) renderView(); }, 120));
}
/** create a subtask from a line of text (shortcuts work, the group always follows the parent) */
function addSubtaskFromText(parent, text) {
  if (!parent || !String(text).trim()) return null;
  if (taskDepth(parent) + 1 > MAX_NEST) { toast(`Subtasks can go ${MAX_NEST} levels deep.`); return null; }
  const res = parseImport(text, { ...defaultImportOpts(), keywords: false, create: false, mode: 'lines', base: parent.areaId });
  const it = res.items[0]; if (!it) return null;
  let c;
  mutate('Add subtask', () => {
    c = newTask({ title: it.title, notes: it.notes || '', subnotes: it.subnotes.map(s => ({ id: uid('s'), text: s.text, done: !!s.done, note: '' })), typeId: it.typeId || null, priorityId: it.priorityId || null, due: it.due || null, duration: it.duration || null, repeat: it.repeat || '', tags: it.tags || [], parentId: parent.id, areaId: parent.areaId });
    D.tasks.push(c); U.exp[parent.id] = true;
  });
  saveUI(); return c;
}

/* ---------- card menu (right-click) ---------- */
function pointAnchor(x, y) { return { getBoundingClientRect: () => ({ left: x, right: x, top: y, bottom: y, width: 0, height: 0 }) }; }
function onContextMenu(e) {
  if (U.view !== 'board' && U.view !== 'outline' && U.view !== 'list') return;
  const el = e.target.closest?.('.card, .subcard, .ol-item, tr[data-id]'); if (!el || e.target.closest('input, textarea, select, a')) return;
  e.preventDefault();
  taskMenu(pointAnchor(e.clientX, e.clientY), el.dataset.id);
}
function taskMenu(anchor, id) {
  const t = TASK[id]; if (!t) return;
  const ids = sel.has(id) && sel.size > 1 ? [...sel] : [id];
  const many = ids.length > 1, label = many ? `${ids.length} tasks` : `“${t.title.length > 34 ? t.title.slice(0, 32) + '…' : t.title}”`;
  const items = [{ hd: label }];
  if (!many) items.push({ label: 'Open', onPick: () => openEditor(id) });
  if (!many && U.view === 'board' && isRootTask(t)) items.push({ label: U.exp[id] ? 'Collapse card' : 'Expand card', onPick: () => toggleExp(id) });
  items.push({ hd: 'Card color' }, { swatches: true, value: many ? null : t.color, onPick: c => colorTasks(ids, c) });
  items.push({ sep: true });
  if (!many) items.push({ label: 'Add a subtask', onPick: () => { if (U.view === 'board' && isRootTask(t)) startSubAdd(id); else openEditor(id, { focus: 'subtask' }); } });
  items.push({ label: 'Nest under another task…', onPick: () => pickParent(anchor, ids) });
  if (ids.some(i => parentOf(TASK[i]))) items.push({ label: 'Make top-level', onPick: () => unnestTasks(ids) });
  if (!many && parentOf(t) && !childrenOf(id).length) items.push({ label: 'Turn into a subnote of its parent', onPick: () => toSubnote(t) });
  items.push({ label: 'Move to…', onPick: () => popMenu(anchor, areaMenuItems(aid => moveToArea(ids, aid)), { filter: true }) });
  items.push({ sep: true });
  items.push({ label: 'Duplicate', onPick: () => { sel = new Set(ids); duplicateSel(); } });
  items.push({ label: 'Copy as text', onPick: async () => { await copyText(tasksAsText(ids.map(i => TASK[i]))); toast('Copied as text'); } });
  items.push({ label: 'Delete', onPick: () => deleteTasks(ids.map(i => TASK[i])) });
  popMenu(anchor, items);
}
function pickParent(anchor, ids) {
  const moving = ids.map(i => TASK[i]).filter(Boolean);
  const blocked = new Set(withDescendants(moving).map(t => t.id));
  const pool = scopeTasks().filter(p => !blocked.has(p.id) && !isDone(p) && moving.every(m => canNest(m, p)));
  const pos = areaPositions();
  pool.sort((a, b) => (pos[rootOf(a).areaId] || 0) - (pos[rootOf(b).areaId] || 0) || rootOf(a).order - rootOf(b).order || taskDepth(a) - taskDepth(b) || a.order - b.order);
  if (!pool.length) { toast('No task here can take these as subtasks.'); return; }
  popMenu(anchor, pool.slice(0, 400).map(p => ({ label: p.title, indent: taskDepth(p), color: areaColor(p.areaId) || '', hint: taskDepth(p) ? '' : (A[p.areaId]?.name || 'Unsorted'), onPick: () => nestTasks(ids, p.id, false) })), { filter: true });
}
function colorTasks(ids, c) {
  const list = ids.map(i => TASK[i]).filter(Boolean);
  mutate(c ? `Color ${COLOR_NAME[c].toLowerCase()}` : 'Remove color', () => list.forEach(t => { t.color = c || ''; t.updated = now(); }));
}
function moveToArea(ids, aid) {
  const list = topmost(ids.map(i => TASK[i]).filter(Boolean));
  mutate(`Moved to ${aid ? A[aid].name : 'Unsorted'}`, () => list.forEach(t => { t.parentId = null; setAreaDeep(t, aid); t.updated = now(); }), { toast: `Moved ${plural(list.length, 'task')} to ${aid ? pathStr(aid) : 'Unsorted'}` });
}
function nestTasks(ids, parentId, copy) {
  const parent = TASK[parentId]; if (!parent) return;
  const list = topmost(ids.map(i => TASK[i]).filter(Boolean)); let n = 0, skipped = 0;
  mutate(`${copy ? 'Copy' : 'Nest'} ${plural(list.length, 'task')}`, () => {
    for (let t of list) {
      if (copy) { const cs = dupDeep(t); D.tasks.push(...cs); reindex(); t = cs[0]; }
      if (nestTask(t, parent)) n++; else { skipped++; if (copy) { const gone = new Set(withDescendants([t]).map(x => x.id)); D.tasks = D.tasks.filter(x => !gone.has(x.id)); reindex(); } }
    }
    U.exp[parentId] = true;
  });
  saveUI();
  if (n) toast(`${copy ? 'Copied' : 'Nested'} ${n > 1 ? plural(n, 'task') : `“${list[0].title}”`} under “${parent.title}”${skipped ? ` (${skipped} couldn’t nest that deep)` : ''}`, { undo: true });
  else toast(`Can’t nest there — subtasks go ${MAX_NEST} levels deep, and a task can’t go inside itself.`);
}
function unnestTasks(ids) {
  const list = ids.map(i => TASK[i]).filter(t => t && parentOf(t));
  mutate('Make top-level', () => list.forEach((t, i) => { t.order = rootOf(t).order + 0.001 * (i + 1); t.parentId = null; t.updated = now(); }), { toast: `${plural(list.length, 'task')} moved out to the top level` });
}
function toSubnote(t) {
  const p = parentOf(t); if (!p || childrenOf(t.id).length) return;
  mutate('Turn into subnote', () => { p.subnotes.push({ id: uid('s'), text: t.title, done: isDone(t), note: t.notes || '' }); D.tasks = D.tasks.filter(x => x.id !== t.id); p.updated = now(); }, { toast: `“${t.title}” is now a subnote of “${p.title}”` });
}
function deleteTasks(list) {
  const all = withDescendants(list.filter(Boolean)); if (!all.length) return;
  const ids = new Set(all.map(t => t.id)); const extra = all.length - list.length;
  if (editingId && ids.has(editingId)) closeDrawer(true);
  mutate(`Delete ${plural(all.length, 'task')}`, () => { D.tasks = D.tasks.filter(t => !ids.has(t.id)); ids.forEach(i => sel.delete(i)); }, { toast: `Deleted ${list.length === 1 ? `“${list[0].title}”` : plural(list.length, 'task')}${extra > 0 ? ` and ${plural(extra, 'subtask')}` : ''}` });
}

/* ---------- selection ---------- */
function toggleSel(id) { sel.has(id) ? sel.delete(id) : sel.add(id); lastClicked = id; refreshSel(); }
function rangeSel(a, b) {
  const ids = $$('#view [data-id]').map(el => el.dataset.id);
  const i = ids.indexOf(a), j = ids.indexOf(b); if (i < 0 || j < 0) { toggleSel(b); return; }
  ids.slice(Math.min(i, j), Math.max(i, j) + 1).forEach(id => sel.add(id)); lastClicked = b; refreshSel();
}
function clearSel() { sel.clear(); refreshSel(); }
function selectAllVisible() {
  const ids = U.view === 'board' ? $$('#view .card').map(c => c.dataset.id) : visibleTasks().map(t => t.id);
  ids.forEach(id => sel.add(id)); refreshSel(); toast(`Selected ${plural(sel.size, 'task')}`);
}
function refreshSel() {
  for (const id of [...sel]) if (!TASK[id]) sel.delete(id);
  $$('.card').forEach(c => { const on = sel.has(c.dataset.id); c.classList.toggle('is-sel', on); const b = c.querySelector('.card-check'); if (b) b.textContent = on ? '✓' : ''; });
  $$('.subcard, .ol-item').forEach(c => c.classList.toggle('is-sel', sel.has(c.dataset.id)));
  $$('tr[data-id]').forEach(r => { const on = sel.has(r.dataset.id); r.classList.toggle('is-sel', on); const cb = r.querySelector('[data-rowsel]'); if (cb) cb.checked = on; });
  renderSelBar();
}
function renderSelBar() {
  const bar = $('#selbar'); for (const id of [...sel]) if (!TASK[id]) sel.delete(id);
  document.body.classList.toggle('has-sel', sel.size > 0);
  $$('.col-key').forEach(k => k.hidden = !sel.size);
  if (!sel.size || U.view === 'settings') { bar.hidden = true; return; }
  bar.hidden = false;
  bar.innerHTML = `<span class="n">${sel.size} selected</span>
    <button class="btn" data-sb="move">Move to…</button><button class="btn" data-sb="type">Type</button><button class="btn" data-sb="priority">Priority</button>
    <button class="btn" data-sb="status">Status</button><button class="btn" data-sb="due">Due</button><button class="btn" data-sb="duration">Time</button>
    <button class="btn" data-sb="color">Color</button><button class="btn" data-sb="nest">Nest under…</button>
    <button class="btn" data-sb="copy">Copy</button><button class="btn" data-sb="dup">Duplicate</button><button class="btn" data-sb="export">Export</button>
    <button class="btn" data-sb="delete">Delete</button><button class="btn" data-sb="clear" aria-label="Clear selection" title="Clear selection (Esc)">✕</button>`;
}
function selTasks() { return [...sel].map(id => TASK[id]).filter(Boolean); }
function bulk(label, fn) {
  const list = selTasks(); const msgs = [];
  mutate(`${label} (${list.length})`, () => list.forEach(t => { const m = fn(t); if (m) msgs.push(m); t.updated = now(); }));
  toast(msgs.length ? msgs[0] + (msgs.length > 1 ? ` (+${msgs.length - 1} more)` : '') : `${label} — ${plural(list.length, 'task')}`, { undo: true });
}
function areaMenuItems(onPick, { includeUnsorted = true } = {}) {
  const items = [];
  if (includeUnsorted) items.push({ label: 'Unsorted', color: '', onPick: () => onPick(null) });
  areaTreeFlat().forEach(({ a, d }) => items.push({ label: a.name, indent: d, color: areaColor(a.id), hint: d === 0 ? '' : '', onPick: () => onPick(a.id) }));
  return items;
}
function fieldMenuItems(field, onPick) {
  if (field === 'type') return [...D.types.map(x => ({ label: `${x.icon ? x.icon + ' ' : ''}${x.name}`, color: x.color, onPick: () => onPick(x.id) })), { sep: true }, { label: 'No type', onPick: () => onPick(null) }];
  if (field === 'priority') return [...D.priorities.map(x => ({ label: x.name, color: x.color, onPick: () => onPick(x.id) })), { sep: true }, { label: 'No priority', onPick: () => onPick(null) }];
  if (field === 'status') return D.statuses.map(x => ({ label: x.name, color: x.color, onPick: () => onPick(x.id) }));
  if (field === 'duration') return [...durPresets().map(m => ({ label: fmtDur(m), onPick: () => onPick(m) })), { sep: true }, { label: 'Not estimated', onPick: () => onPick(null) }];
  if (field === 'due') return [...['today', 'week', 'next', 'later'].map(k => ({ label: `${(DUE_COLS.find(d => d[0] === k) || [])[1]} (${fmtDate(dueForBucket(k))})`, onPick: () => onPick(dueForBucket(k)) })), { label: 'Tomorrow', onPick: () => onPick(addDays(todayStr(), 1)) }, { label: 'Pick a date…', onPick: async () => { const v = await askFields('Due date', [{ key: 'd', label: 'Date', type: 'date', value: todayStr() }]); if (v && v.d) onPick(v.d); } }, { sep: true }, { label: 'No date', onPick: () => onPick(null) }];
  return [];
}
function onSelBarClick(e) {
  const b = e.target.closest('[data-sb]'); if (!b) return;
  const a = b.dataset.sb;
  if (a === 'clear') return clearSel();
  if (a === 'move') return popMenu(b, areaMenuItems(id => moveToArea([...sel], id)), { filter: true });
  if (a === 'color') return popMenu(b, [{ hd: 'Card color' }, { swatches: true, value: null, onPick: c => colorTasks([...sel], c) }]);
  if (a === 'nest') return pickParent(b, [...sel]);
  if (a === 'type') return popMenu(b, fieldMenuItems('type', id => bulk('Type set', t => { t.typeId = id; })));
  if (a === 'priority') return popMenu(b, fieldMenuItems('priority', id => bulk('Priority set', t => { t.priorityId = id; })));
  if (a === 'status') return popMenu(b, fieldMenuItems('status', id => bulk('Status set', t => setStatus(t, id))));
  if (a === 'duration') return popMenu(b, fieldMenuItems('duration', m => bulk('Time set', t => { t.duration = m; })));
  if (a === 'due') return popMenu(b, fieldMenuItems('due', d => bulk('Due date set', t => { t.due = d; })));
  if (a === 'copy') return copySelection();
  if (a === 'dup') return duplicateSel();
  if (a === 'export') return openExport({ scope: 'selected' });
  if (a === 'delete') return deleteSel();
}
function duplicateSel() {
  const list = topmost(selTasks()); if (!list.length) return;
  mutate(`Duplicate ${plural(list.length, 'task')}`, () => { const made = list.map(t => { const cs = dupDeep(t); D.tasks.push(...cs); return cs[0]; }); sel = new Set(made.map(t => t.id)); }, { toast: `Duplicated ${plural(list.length, 'task')}` });
}
function deleteSel() { deleteTasks(topmost(selTasks())); sel.clear(); renderSelBar(); }
function moveSelToCol(n) {
  const cols = fieldCols(U.group).filter(c => !c.nodrop); const c = cols[n]; if (!c) return;
  moveTasks([...sel], [c.key], null, false, null);
}

/* ---------- column menu & add column ---------- */
function colTasks(key) { return boardRoots().filter(t => keyOf(t, U.group) === key); }
function colMenu(anchor, key) {
  const c = fieldCols(U.group).find(x => x.key === key); if (!c) return;
  const list = colTasks(key);
  const items = [];
  if (c.drill) items.push({ label: `Open ${c.label}`, onPick: () => drill(c.areaId) });
  if (U.group === 'area' && c.inbox && list.length) items.push({ label: 'Triage these one by one', onPick: () => openTriage() });
  items.push({ label: `Select all ${list.length}`, onPick: () => { list.forEach(t => sel.add(t.id)); refreshSel(); } });
  items.push({ sep: true });
  items.push({ label: 'Copy as a plain list', onPick: async () => { await copyText(tasksAsText(list, false)); toast(`Copied ${plural(list.length, 'task')}`); } });
  items.push({ label: 'Copy as Markdown checklist', onPick: async () => { await copyText(`## ${c.label}\n\n` + list.map(t => [mdTask(t), ...taskDescendants(t).map(x => mdTask(x, {}, '    '.repeat(taskDepth(x) - taskDepth(t))))].join('\n')).join('\n')); toast('Copied as Markdown'); } });
  items.push({ label: 'Export this column…', onPick: () => openExport({ ids: withDescendants(list).map(t => t.id), label: c.label }) });
  const [f, v] = [key.slice(0, key.indexOf('|')), key.slice(key.indexOf('|') + 1)];
  if (v && ['area', 'type', 'priority', 'status'].includes(f)) {
    items.push({ sep: true });
    items.push({ label: 'Rename…', onPick: () => renameEntity(f, v) });
    if (f === 'area') items.push({ label: `Add ${aAn(levelName(depthOf(v) + 1).toLowerCase())} inside`, onPick: () => addArea(v) });
    items.push({ label: 'Edit in Configure', onPick: () => { U.settingsTab = f === 'area' ? 'hierarchy' : f === 'type' ? 'types' : f === 'priority' ? 'priorities' : 'statuses'; setView('settings'); } });
  }
  popMenu(anchor, items);
}
async function renameEntity(f, id) {
  const ent = f === 'area' ? A[id] : f === 'type' ? T[id] : f === 'priority' ? PR[id] : ST[id]; if (!ent) return;
  const r = await askFields('Rename', [{ key: 'name', label: 'Name', value: ent.name }]);
  if (r && r.name.trim()) mutate('Rename', () => { ent.name = r.name.trim(); });
}
async function addArea(parentId) {
  const lvl = levelName(depthOf(parentId) + 1);
  const r = await askFields(`New ${lvl.toLowerCase()}`, [{ key: 'name', label: 'Name', placeholder: parentId ? `Inside ${A[parentId].name}` : 'e.g. a business, organization or “Personal”' }, { key: 'kw', label: 'Keywords for auto-sort (optional)', placeholder: 'comma, separated, words' }]);
  if (!r || !r.name.trim()) return null;
  let id = null;
  mutate(`Add ${lvl}`, () => { const a = { id: uid('ar'), name: r.name.trim(), parentId: parentId || null, color: parentId ? '' : nextColor(), keywords: r.kw || '', notes: '', order: kids(parentId).length }; D.areas.push(a); id = a.id; });
  return id;
}
async function addColumn() {
  const g = U.group;
  if (g === 'area') return addArea(cur());
  if (g === 'duration') { const r = await askFields('New duration', [{ key: 'v', label: 'Length', placeholder: 'e.g. 45m or 3h' }]); const m = r && parseDuration(r.v); if (m) mutate('Add duration', () => { D.durations.push(m); }); return; }
  const r = await askFields(`New ${addColLabel()}`, [{ key: 'name', label: 'Name' }]); if (!r || !r.name.trim()) return;
  const name = r.name.trim();
  mutate('Add column', () => {
    if (g === 'type') D.types.push({ id: uid('ty'), name, icon: '', color: PALETTE[D.types.length % PALETTE.length], keywords: '' });
    else if (g === 'priority') D.priorities.push({ id: uid('pr'), name, color: '#64748B' });
    else if (g === 'status') { const di = D.statuses.findIndex(s => s.done); const s = { id: uid('st'), name, color: PALETTE[D.statuses.length % PALETTE.length], done: false }; di < 0 ? D.statuses.push(s) : D.statuses.splice(di, 0, s); }
    else if (g.startsWith('cf:')) { const f = D.fields.find(x => x.id === g.slice(3)); if (f && !f.options.includes(name)) f.options.push(name); }
  });
}

/* ---------- drag & drop ---------- */
let dropAt = null; // { mode: 'nest' | 'before' | 'after' | 'cell', id, cell }
function cleanupDrag() {
  $$('.is-dragging').forEach(c => c.classList.remove('is-dragging'));
  $$('.cell.is-over').forEach(c => c.classList.remove('is-over'));
  $$('.nest-target').forEach(c => c.classList.remove('nest-target'));
  if (ph) ph.remove(); dropAt = null;
}
function onDragStart(e) {
  if (U.view !== 'board') return;
  const el = e.target.closest?.('.subcard, .card'); if (!el) return;
  const id = el.dataset.id; const ids = sel.has(id) ? [...sel].filter(i => TASK[i]) : [id];
  const top = topmost(ids.map(i => TASK[i]));
  drag = { ids: top.map(t => t.id), all: new Set(withDescendants(top).map(t => t.id)) };
  e.dataTransfer.effectAllowed = 'copyMove';
  try { e.dataTransfer.setData('text/plain', tasksAsText(top)); } catch (_) { }
  if (top.length > 1) { const g = document.createElement('div'); g.className = 'drag-ghost'; g.textContent = `${top.length} tasks`; document.body.appendChild(g); try { e.dataTransfer.setDragImage(g, 14, 14); } catch (_) { } setTimeout(() => g.remove(), 0); }
  setTimeout(() => drag && drag.ids.forEach(i => $$(`[data-id="${CSS.escape(i)}"]`).forEach(x => x.classList.contains('card') || x.classList.contains('subcard') ? x.classList.add('is-dragging') : 0)), 0);
}
/** where would a drop land? Over the middle of a card = nest; card edges = reorder; elsewhere in a column = move */
function dropTarget(e) {
  const cell = e.target.closest?.('.cell');
  if (drag) {
    const over = e.target.closest?.('.subcard, .card');
    if (over && !drag.all.has(over.dataset.id)) {
      const tgt = TASK[over.dataset.id], r = over.getBoundingClientRect();
      const isSub = over.classList.contains('subcard');
      const head = isSub ? r : (over.querySelector('.card-body') ? { top: r.top, bottom: over.querySelector('.card-body').getBoundingClientRect().top } : r);
      const edge = Math.min((head.bottom - head.top) * 0.28, 16);
      const y = e.clientY; const inHead = y <= head.bottom;
      let mode = !inHead ? 'nest' : y < head.top + edge ? 'before' : (y > head.bottom - edge && head === r) ? 'after' : 'nest';
      const moving = drag.ids.map(i => TASK[i]);
      if (mode === 'nest') {
        if (moving.every(m => canNest(m, tgt))) return { mode, id: tgt.id, el: over };
        mode = isSub ? 'none' : 'cell';
      }
      if (isSub && (mode === 'before' || mode === 'after')) {
        const p = parentOf(tgt);
        return p && moving.every(m => canNest(m, p)) ? { mode, id: tgt.id, el: over } : { mode: 'none' };
      }
      if (isSub) return { mode: 'none' };
    }
  }
  if (!cell || cell.classList.contains('nodrop')) return { mode: 'none' };
  return { mode: 'cell', cell };
}
function onDragOver(e) {
  if (U.view !== 'board') return;
  autoScroll(e);
  const d = dropTarget(e);
  $$('.nest-target').forEach(c => c !== d.el && c.classList.remove('nest-target'));
  if (d.mode === 'none') { $$('.cell.is-over').forEach(c => c.classList.remove('is-over')); if (ph) ph.remove(); dropAt = null; return; }
  e.preventDefault();
  const copy = U.copyDrop || e.altKey || e.ctrlKey || e.metaKey;
  try { e.dataTransfer.dropEffect = drag ? (copy ? 'copy' : 'move') : 'copy'; } catch (_) { }
  dropAt = d;
  if (d.mode === 'nest') { $$('.cell.is-over').forEach(c => c.classList.remove('is-over')); if (ph) ph.remove(); d.el.classList.add('nest-target'); d.el.dataset.nestLabel = copy ? 'Copy here as a subtask' : 'Make it a subtask'; return; }
  if (d.mode === 'before' || d.mode === 'after') {
    $$('.cell.is-over').forEach(c => c.classList.remove('is-over'));
    if (!ph) { ph = document.createElement('div'); ph.className = 'drop-ph'; }
    const ref = d.mode === 'before' ? d.el : d.el.nextSibling;
    if (ph.nextSibling !== ref || ph.parentNode !== d.el.parentNode) d.el.parentNode.insertBefore(ph, ref);
    ph.style.marginLeft = getComputedStyle(d.el).marginLeft;
    return;
  }
  const cell = d.cell; if (ph) ph.style.marginLeft = '';
  if (!cell.classList.contains('is-over')) { $$('.cell.is-over').forEach(c => c.classList.remove('is-over')); cell.classList.add('is-over'); }
  placePh(cell, e.clientY);
}
function onDragLeave(e) { const cell = e.target.closest?.('.cell'); if (cell && !cell.contains(e.relatedTarget)) cell.classList.remove('is-over'); }
function onDrop(e) {
  if (U.view !== 'board') return;
  const d = dropTarget(e);
  if (d.mode === 'none') { drag = null; cleanupDrag(); return; }
  e.preventDefault();
  const copy = U.copyDrop || e.altKey || e.ctrlKey || e.metaKey;
  if (drag && d.mode === 'nest') { const ids = drag.ids; drag = null; cleanupDrag(); nestTasks(ids, d.id, copy); return; }
  if (drag && (d.mode === 'before' || d.mode === 'after')) { const ids = drag.ids; drag = null; cleanupDrag(); placeSiblings(ids, d.id, d.mode === 'after', copy); return; }
  const cell = d.cell;
  const before = ph && ph.parentNode === cell ? (ph.dataset.before || null) : null;
  const keys = [cell.dataset.col, cell.dataset.lane].filter(Boolean);
  if (drag) { const ids = drag.ids; drag = null; moveTasks(ids, keys, before, copy, cell); cleanupDrag(); return; }
  cleanupDrag();
  const files = Array.from(e.dataTransfer.files || []);
  if (files.length) { readTextFiles(files).then(text => text && openImport(text, keys)); return; }
  const text = e.dataTransfer.getData('text/plain');
  if (text && text.trim()) pasteTextInto(text, keys);
}
function placePh(cell, y) {
  if (U.sort !== 'manual') { if (ph) ph.remove(); return; }
  if (!ph) { ph = document.createElement('div'); ph.className = 'drop-ph'; }
  const cards = $$(':scope > .card:not(.is-dragging)', cell);
  const before = cards.find(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
  const anchor = before || cell.querySelector(':scope > .add-inline, :scope > .inline-inp');
  if (anchor) { if (ph.nextSibling !== anchor) cell.insertBefore(ph, anchor); } else if (ph.parentNode !== cell || ph.nextSibling) cell.appendChild(ph);
  ph.dataset.before = before ? before.dataset.id : '';
}
function autoScroll(e) {
  const v = $('#view'); const r = v.getBoundingClientRect(); const edge = 70, sp = 18;
  if (e.clientX > r.right - edge) v.scrollLeft += sp; else if (e.clientX < r.left + edge) v.scrollLeft -= sp;
  if (e.clientY > r.bottom - edge) v.scrollTop += sp; else if (e.clientY < r.top + edge + 60) v.scrollTop -= sp;
}
/** orders that slot `count` items between two neighbours */
function ordersBetween(prev, next, count) {
  const lo = prev ? prev.order : (next ? next.order - count - 1 : maxOrder() + 1);
  const hi = next ? next.order : lo + count + 1;
  const step = (hi - lo) / (count + 1);
  return Array.from({ length: count }, (_, i) => lo + step * (i + 1));
}
/** drop beside a task: it becomes that task's sibling (same parent, same group), in that spot */
function placeSiblings(ids, refId, after, copy) {
  const ref = TASK[refId]; if (!ref) return; const parent = parentOf(ref);
  const sibsOf = () => parent ? childrenOf(parent.id) : D.tasks.filter(x => isRootTask(x) && (x.areaId || null) === (ref.areaId || null)).sort((a, b) => a.order - b.order);
  mutate(`${copy ? 'Copy' : 'Move'} ${plural(ids.length, 'task')}`, () => {
    let list = topmost(ids.map(i => TASK[i]).filter(Boolean));
    if (copy) { list = list.map(t => { const cs = dupDeep(t); D.tasks.push(...cs); return cs[0]; }); reindex(); }
    list = list.filter(t => !parent || canNest(t, parent));
    const moving = new Set(list.map(t => t.id));
    const sibs = sibsOf().filter(s => !moving.has(s.id));
    const i = sibs.indexOf(ref) + (after ? 1 : 0);
    if (sibs[i] && sibs[i - 1] && Math.abs(sibs[i].order - sibs[i - 1].order) < 1e-6 * (list.length + 1)) renumber();
    const ords = ordersBetween(sibs[i - 1], sibs[i], list.length);
    list.forEach((t, k) => { t.parentId = parent ? parent.id : null; setAreaDeep(t, parent ? parent.areaId : ref.areaId); t.order = ords[k]; t.updated = now(); });
  });
}
function moveTasks(ids, keys, beforeId, copy, cellEl) {
  const msgs = []; let made = [];
  const top = topmost(ids.map(i => TASK[i]).filter(Boolean)); const n = top.length; if (!n) return;
  const wasNested = top.filter(t => parentOf(t)).length;
  mutate(`${copy ? 'Copy' : 'Move'} ${plural(n, 'task')}`, () => {
    let list = top;
    if (copy) { list = list.map(t => { const cs = dupDeep(t); D.tasks.push(...cs); return cs[0]; }); made = list; reindex(); }
    for (const t of list) { t.parentId = null; for (const k of keys) { const m = applyKey(t, k); if (m) msgs.push(m); } }
    if (U.sort === 'manual' && cellEl) placeOrder(list, cellEl, beforeId);
    if (copy) sel = new Set(made.map(t => t.id));
  });
  if (msgs.length) toast(msgs[0] + (msgs.length > 1 ? ` (+${msgs.length - 1} more)` : ''), { undo: true });
  else if (copy) toast(`Copied ${plural(n, 'task')} to ${keys.map(keyLabel).filter(Boolean).join(' · ')}`, { undo: true });
  else if (wasNested) toast(`${wasNested === 1 ? 'Subtask' : plural(wasNested, 'subtask')} moved out to the top level`, { undo: true });
}
function placeOrder(list, cellEl, beforeId, depth = 0) {
  const moved = new Set(list.map(t => t.id));
  const ids = $$(':scope > .card', cellEl).map(c => c.dataset.id).filter(id => !moved.has(id) && TASK[id]);
  let idx = beforeId ? ids.indexOf(beforeId) : ids.length; if (idx < 0) idx = ids.length;
  const prev = idx > 0 ? TASK[ids[idx - 1]] : null, next = idx < ids.length ? TASK[ids[idx]] : null;
  const lo = prev ? prev.order : (next ? next.order - list.length - 1 : maxOrder() + 1);
  const hi = next ? next.order : lo + list.length + 1;
  if ((hi - lo) / (list.length + 1) < 1e-7 && depth < 1) { renumber(); return placeOrder(list, cellEl, beforeId, depth + 1); }
  const step = (hi - lo) / (list.length + 1);
  list.forEach((t, i) => { t.order = lo + step * (i + 1); });
}

/* ---------- clipboard ---------- */
function makeClip(list) { const top = topmost(list); return { text: tasksAsText(top), data: withDescendants(top).map(clone), n: top.length }; }
async function copySelection(cut = false) {
  const list = selTasks(); if (!list.length) return;
  clip = makeClip(list);
  await copyText(clip.text);
  if (cut) { const all = new Set(clip.data.map(t => t.id)); mutate(`Cut ${plural(clip.n, 'task')}`, () => { D.tasks = D.tasks.filter(t => !all.has(t.id)); sel.clear(); }); }
  toast(`${cut ? 'Cut' : 'Copied'} ${plural(clip.n, 'task')} — paste into any column, or into another app as text`, { undo: cut });
}
function pasteClip(keys) {
  if (!clip) return;
  mutate(`Paste ${plural(clip.n, 'task')}`, () => {
    const map = new Map(clip.data.map(d => [d.id, uid('t')])); let ord = maxOrder(); const made = [];
    for (const d of clip.data) { const c = dupTask(d); c.id = map.get(d.id); c.parentId = d.parentId && map.has(d.parentId) ? map.get(d.parentId) : null; c.order = ++ord; D.tasks.push(c); made.push(c); }
    reindex();
    const roots = made.filter(c => !c.parentId);
    roots.forEach(c => { keys.forEach(k => applyKey(c, k)); setAreaDeep(c, c.areaId); });
    sel = new Set(roots.map(t => t.id));
  }, { toast: `Pasted ${plural(clip.n, 'task')}${keys.length ? ' into ' + keys.map(keyLabel).filter(Boolean).join(' · ') : ''}` });
}
function pasteTextInto(text, keys) {
  const lines = text.split('\n').filter(l => l.trim()).length;
  if (lines > 1) return openImport(text, keys);
  const out = quickAddText(text, keys, { base: cur() });
  if (out && out.created[0]) toast(`Added “${out.created[0].title}”`, { undo: true });
}
function currentPasteKeys() { return U.view === 'board' && hoverCell && hoverCell.isConnected ? [hoverCell.dataset.col, hoverCell.dataset.lane].filter(Boolean) : []; }
function onCopy(e) {
  if (isTypingTarget(document.activeElement) || anyLayerOpen() || !sel.size) return;
  if (window.getSelection && String(window.getSelection()).trim()) return;
  clip = makeClip(selTasks());
  e.clipboardData.setData('text/plain', clip.text); e.preventDefault();
  toast(`Copied ${plural(clip.n, 'task')} — paste into any column, or into another app as text`);
}
function onCut(e) { if (isTypingTarget(document.activeElement) || anyLayerOpen() || !sel.size) return; onCopy(e); const all = new Set(clip.data.map(t => t.id)); mutate('Cut', () => { D.tasks = D.tasks.filter(t => !all.has(t.id)); sel.clear(); }, { toast: 'Cut — paste to place them' }); }
function onPaste(e) {
  if (isTypingTarget(document.activeElement) || anyLayerOpen() || U.view === 'settings') return;
  const text = e.clipboardData?.getData('text/plain') || '';
  const keys = currentPasteKeys();
  if (clip && text && text.replace(/\r/g, '') === clip.text) { e.preventDefault(); pasteClip(keys); return; }
  if (text.trim()) { e.preventDefault(); pasteTextInto(text, keys); }
}
async function readTextFiles(files) {
  const parts = [];
  for (const f of files) {
    if (/\.(txt|md|markdown|csv|tsv|text)$/i.test(f.name) || /^text\//.test(f.type)) parts.push(await f.text());
    else if (/\.json$/i.test(f.name)) { toast('To restore a HatRack backup, use Configure → Data.'); }
    else toast(`“${f.name}” isn’t a text file. Drop .txt, .md or .csv files.`);
  }
  return parts.join('\n\n');
}
