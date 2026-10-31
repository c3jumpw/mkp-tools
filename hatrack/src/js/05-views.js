/* ============ HatRack — list, outline and report views ============ */

function metaPills(t, skip = {}) {
  const p = []; const ty = T[t.typeId], pr = PR[t.priorityId], st = ST[t.statusId];
  if (!skip.type && ty) p.push(`<span class="pill" style="--c:${ty.color}">${ty.icon ? esc(ty.icon) + ' ' : ''}${esc(ty.name)}</span>`);
  if (pr) p.push(`<span class="pill" style="--c:${pr.color}"><span class="d"></span>${esc(pr.name)}</span>`);
  if (st && t.statusId !== defaultStatus()) p.push(`<span class="pill" style="--c:${st.color}"><span class="d"></span>${esc(st.name)}</span>`);
  if (t.due) { const b = dueBucket(t); p.push(`<span class="pill${b === 'overdue' && !isDone(t) ? ' over' : b === 'today' ? ' today' : ''}">${esc(fmtDate(t.due))}</span>`); }
  if (t.repeat) p.push(`<span class="pill">↻ ${esc(REPEAT_LABEL[t.repeat].toLowerCase())}</span>`);
  if (t.duration) p.push(`<span class="pill">◷ ${fmtDur(t.duration)}</span>`);
  if ((t.seen || 1) > 1) p.push(`<span class="pill seen">noted ×${t.seen}</span>`);
  if (t.attachments.length) p.push(`<span class="pill">📎 ${t.attachments.length}</span>`);
  t.tags.forEach(g => p.push(`<span class="pill">#${esc(g)}</span>`));
  D.fields.forEach(f => { const v = t.custom?.[f.id]; if (v !== undefined && v !== '' && v !== false) p.push(`<span class="pill">${esc(f.name)}: ${esc(v === true ? 'yes' : v)}</span>`); });
  return p.join('');
}
const idxOf = (arr, id) => { const i = arr.findIndex(x => x.id === id); return i < 0 ? 999 : i; };

/* ---------- list ---------- */
const LIST_COLS = [['title', 'Task'], ['path', 'Where'], ['type', 'Type'], ['priority', 'Priority'], ['status', 'Status'], ['duration', 'Time'], ['due', 'Due'], ['repeat', 'Repeats'], ['tags', 'Tags'], ['source', 'Source'], ['seen', 'Noted'], ['updated', 'Updated']];
function listSorter(key) {
  const pos = areaPositions();
  return {
    title: (a, b) => a.title.localeCompare(b.title),
    path: (a, b) => (pos[a.areaId] || 0) - (pos[b.areaId] || 0),
    type: (a, b) => idxOf(D.types, a.typeId) - idxOf(D.types, b.typeId),
    priority: (a, b) => prank(a) - prank(b),
    status: (a, b) => idxOf(D.statuses, a.statusId) - idxOf(D.statuses, b.statusId),
    duration: (a, b) => (a.duration || 1e9) - (b.duration || 1e9),
    due: (a, b) => (a.due || '9999').localeCompare(b.due || '9999'),
    repeat: (a, b) => (a.repeat || '~').localeCompare(b.repeat || '~'),
    tags: (a, b) => (a.tags.join() || '~').localeCompare(b.tags.join() || '~'),
    source: (a, b) => (a.source || '~').localeCompare(b.source || '~'),
    seen: (a, b) => (b.seen || 1) - (a.seen || 1),
    updated: (a, b) => b.updated - a.updated,
    order: (a, b) => a.order - b.order,
  }[key] || ((a, b) => a.order - b.order);
}
function renderList() {
  const view = $('#view');
  const list = visibleTasks(); const s = U.listSort; const fn = listSorter(s.key);
  list.sort((a, b) => fn(a, b) * s.dir || a.order - b.order);
  if (!list.length) {
    view.innerHTML = `<div class="list-view"><div class="empty"><h2>No tasks here</h2><p>${filtersActive() ? 'Nothing matches these filters.' : 'Add tasks with the quick-add bar, or bring in a long list with Import.'}</p><div class="acts">${filtersActive() ? '<button class="btn" data-lv="clear">Clear filters</button>' : '<button class="btn primary" data-act="import">Import notes</button>'}</div></div></div>`;
    return;
  }
  const AREA = opt('', 'Unsorted', '') + areaTreeFlat().map(({ a, d }) => opt(a.id, ' '.repeat(d) + a.name, '')).join('');
  const TYPE = opt('', '—', '') + D.types.map(x => opt(x.id, `${x.icon ? x.icon + ' ' : ''}${x.name}`, '')).join('');
  const PRI = opt('', '—', '') + D.priorities.map(x => opt(x.id, x.name, '')).join('');
  const STAT = D.statuses.map(x => opt(x.id, x.name, '')).join('');
  const all = list.every(t => sel.has(t.id));
  const arrow = k => (s.key === k ? (s.dir > 0 ? ' ↑' : ' ↓') : '');
  const rows = list.map(t => {
    const ty = T[t.typeId]; const b = dueBucket(t);
    return `<tr data-id="${t.id}" class="${sel.has(t.id) ? 'is-sel' : ''}">
      <td><input type="checkbox" data-rowsel ${sel.has(t.id) ? 'checked' : ''} aria-label="Select ${esc(t.title)}"></td>
      <td class="t-title">${t.color ? `<span class="cdot" style="--sw:${tintVar(t.color)}" title="${COLOR_NAME[t.color]}"></span>` : ''}${parentOf(t) ? '<span class="muted" title="Subtask">↳ </span>' : ''}<button data-open class="clamp-inline">${ty?.icon ? esc(ty.icon) + ' ' : ''}${isDone(t) ? `<s>${esc(t.title)}</s>` : esc(t.title)}</button>${parentOf(t) ? `<div class="muted sm">in ${esc(parentOf(t).title)}</div>` : ''}${t.subnotes.length ? `<span class="badge">${t.subnotes.filter(x => x.done).length}/${t.subnotes.length}</span>` : ''}${t.notes ? ' <span class="muted" title="Has notes">✎</span>' : ''}${t.attachments.length ? ' <span class="muted" title="Attachments">📎</span>' : ''}</td>
      <td><select class="inp" data-set="area" data-v="${t.areaId || ''}" title="${esc(pathStr(t.areaId) || 'Unsorted')}">${AREA}</select></td>
      <td><select class="inp" data-set="type" data-v="${t.typeId || ''}">${TYPE}</select></td>
      <td><select class="inp" data-set="priority" data-v="${t.priorityId || ''}">${PRI}</select></td>
      <td><select class="inp" data-set="status" data-v="${t.statusId || ''}">${STAT}</select></td>
      <td>${fmtDur(t.duration)}</td>
      <td>${t.due ? `<span class="pill${b === 'overdue' && !isDone(t) ? ' over' : b === 'today' ? ' today' : ''}">${esc(fmtDate(t.due))}</span>` : ''}</td>
      <td>${t.repeat ? esc(SHORT_REPEAT[t.repeat]) : ''}</td>
      <td>${t.tags.map(g => '#' + esc(g)).join(' ')}</td>
      <td>${esc(t.source)}</td>
      <td>${(t.seen || 1) > 1 ? '×' + t.seen : ''}</td>
      <td class="muted">${esc(fmtDate(ymd(new Date(t.updated))))}</td></tr>`;
  }).join('');
  view.innerHTML = `<div class="list-view"><div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th><input type="checkbox" data-lv="all" ${all ? 'checked' : ''} aria-label="Select all"></th>
      ${LIST_COLS.map(([k, l]) => `<th><button data-sort="${k}">${l}${arrow(k)}</button></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
      <p class="muted sm">${plural(list.length, 'task')} · click a heading to sort · selects edit in place</p></div>`;
  $$('select[data-set]', view).forEach(sl => { sl.value = sl.dataset.v; });
}
function onListEvent(e) {
  if (U.view !== 'list') return;
  const el = e.target;
  if (e.type === 'change' && el.matches('select[data-set]')) {
    const t = TASK[el.closest('tr').dataset.id]; if (!t) return; const v = el.value || null; const f = el.dataset.set;
    let msg = null;
    mutate('Edit task', () => { if (f === 'area') { if (parentOf(t) && v !== t.areaId) t.parentId = null; setAreaDeep(t, v); } else if (f === 'type') t.typeId = v; else if (f === 'priority') t.priorityId = v; else if (f === 'status') msg = setStatus(t, v); t.updated = now(); });
    if (msg) toast(msg, { undo: true });
    return;
  }
  if (e.type === 'change' && el.matches('[data-rowsel]')) { const id = el.closest('tr').dataset.id; el.checked ? sel.add(id) : sel.delete(id); lastClicked = id; refreshSel(); return; }
  if (e.type === 'change' && el.matches('[data-lv="all"]')) { const ids = visibleTasks().map(t => t.id); if (el.checked) ids.forEach(i => sel.add(i)); else ids.forEach(i => sel.delete(i)); refreshSel(); return; }
  if (e.type !== 'click') return;
  const b = el.closest('button'); if (!b) return;
  if (b.dataset.sort) { const k = b.dataset.sort; U.listSort = U.listSort.key === k ? { key: k, dir: -U.listSort.dir } : { key: k, dir: 1 }; saveUI(); renderList(); return; }
  if (b.dataset.lv === 'clear') { U.f = { ...UI_DEFAULT.f }; saveUI(); renderAll(); return; }
  if (b.hasAttribute('data-open')) openEditor(b.closest('tr').dataset.id);
}

/* ---------- outline ---------- */
function outlineItem(t) {
  const ty = T[t.typeId], open = !!U.exp[t.id], kidsT = childrenOf(t.id);
  return `<li class="ol-item${isDone(t) ? ' is-done' : ''}${sel.has(t.id) ? ' is-sel' : ''}${open ? ' is-open' : ''}" data-id="${t.id}" data-clamphost>
    <div class="ol-row" draggable="true" style="${t.color ? `--cbg:${tintVar(t.color)}` : ''}" ${t.color ? `data-bg="${t.color}"` : ''}>
      <span class="ol-grip" aria-hidden="true" title="Drag to move, or drop on a task to nest">⠿</span>
      <input type="checkbox" data-done ${isDone(t) ? 'checked' : ''} aria-label="Done">
      <div class="ol-body">
        <button class="t clamp" data-open>${ty?.icon ? esc(ty.icon) + ' ' : ''}${esc(t.title)}</button>
        <div class="m">${metaPills(t, { type: true })}</div>
        ${t.notes ? `<div class="n clamp">${linkify(esc(t.notes))}</div>` : ''}
        <button class="ol-more" data-more${open ? '' : ' hidden'}>${open ? 'Show less' : 'Show more'}</button>
        ${t.subnotes.length ? `<ul class="ol-subs">${t.subnotes.map(s => `<li class="ol-sub" draggable="true" data-sid="${s.id}"><label class="chk"><input type="checkbox" data-subdone="${s.id}" ${s.done ? 'checked' : ''}> ${s.done ? `<s>${esc(s.text)}</s>` : esc(s.text)}</label>${s.note ? ` <span class="muted">— ${esc(s.note)}</span>` : ''}</li>`).join('')}</ul>` : ''}
      </div></div>
    ${kidsT.length ? `<ul class="ol-list ol-children">${kidsT.map(outlineItem).join('')}</ul>` : ''}</li>`;
}
function renderOutline() {
  const view = $('#view'); const c = cur();
  const vis = visibleTasks();
  const roots = new Map(); vis.forEach(t => { const r = rootOf(t); roots.set(r.id, r); });
  const list = sortTasks([...roots.values()], U.sort);
  const byArea = new Map(); list.forEach(t => { const k = t.areaId && A[t.areaId] ? t.areaId : ''; (byArea.get(k) || byArea.set(k, []).get(k)).push(t); });
  const hasAny = id => (byArea.get(id) || []).length || descendants(id).some(d => (byArea.get(d.id) || []).length);
  const count = withDescendants(list).length;
  let h = `<div class="outline"><div class="outline-actions">
    <button class="btn" data-ol="copy">Copy as Markdown</button><button class="btn" data-ol="dl">Download .md</button><button class="btn" data-ol="print">Print or save as PDF</button>
    <label class="chk sm"><input type="checkbox" data-ol="empty" ${U.olEmpty ? 'checked' : ''}> Show empty groups</label><span class="spacer"></span><span class="muted sm">${plural(count, 'task')} · drag ⠿ to move or nest</span></div>`;
  const rootTasks = byArea.get(c || '') || [];
  if (rootTasks.length || (U.olEmpty && D.areas.length)) h += `<section class="ol-sec"><h2 class="ol-h l1" data-area="${c || ''}" style="--c:var(--line)">${c ? esc(A[c].name) + ' — not yet sorted' : 'Unsorted'}</h2><ul class="ol-list">${rootTasks.map(outlineItem).join('')}</ul></section>`;
  const walk = (pid, lvl) => kids(pid).map(a => {
    if (!U.olEmpty && !hasAny(a.id)) return '';
    const ts = byArea.get(a.id) || [];
    return `<section class="ol-sec${lvl > 1 ? ' ol-indent' : ''}"><h${Math.min(lvl + 1, 6)} class="ol-h l${lvl}" data-area="${a.id}" style="--c:${areaColor(a.id) || 'var(--line)'}"><span class="sw"></span>${esc(a.name)}<span class="muted sm" style="font-family:var(--font-ui);font-weight:400">${ts.length ? plural(withDescendants(ts).length, 'task') : ''}</span></h${Math.min(lvl + 1, 6)}>
      ${a.notes ? `<p class="ol-notes clamp-block">${esc(a.notes)}</p>` : ''}${ts.length ? `<ul class="ol-list">${ts.map(outlineItem).join('')}</ul>` : ''}${walk(a.id, lvl + 1)}</section>`;
  }).join('');
  h += walk(c, 1);
  if (!list.length) h += `<div class="empty"><h2>Nothing to outline</h2><p>${filtersActive() ? 'Nothing matches these filters.' : 'Once tasks are on the rack, this view lays them out as a document you can copy, print or save as PDF.'}</p></div>`;
  view.innerHTML = h + '</div>';
  markClamps(view);
}
function outlineTitle() { return cur() ? `${pathStr(cur())} — tasks` : 'HatRack — all tasks'; }
async function onOutlineEvent(e) {
  if (U.view !== 'outline') return;
  const el = e.target;
  if (e.type === 'change' && el.matches('[data-done]')) { const t = TASK[el.closest('[data-id]').dataset.id]; let msg; mutate(el.checked ? 'Mark done' : 'Reopen', () => { msg = setStatus(t, el.checked ? doneStatus() : defaultStatus()); t.updated = now(); }); if (msg) toast(msg, { undo: true }); return; }
  if (e.type === 'change' && el.matches('[data-subdone]')) { const t = TASK[el.closest('[data-id]').dataset.id]; const s = t?.subnotes.find(x => x.id === el.dataset.subdone); if (s) mutate('Subnote', () => { s.done = el.checked; t.updated = now(); }); return; }
  if (e.type === 'change' && el.dataset.ol === 'empty') { U.olEmpty = el.checked; saveUI(); renderOutline(); return; }
  if (e.type !== 'click') return;
  const row = el.closest('.ol-row');
  if (row && (e.metaKey || e.ctrlKey) && !el.closest('input, a')) { e.preventDefault(); toggleSel(row.closest('[data-id]').dataset.id); return; }
  const b = el.closest('button'); if (!b) return;
  if (b.hasAttribute('data-more')) return toggleExp(b.closest('[data-id]').dataset.id);
  if (b.hasAttribute('data-open')) return openEditor(b.closest('[data-id]').dataset.id);
  const md = () => `# ${outlineTitle()}\n_Exported from HatRack on ${todayStr()}_\n\n` + outlineMarkdown(withDescendants(visibleTasks().map(rootOf)), cur(), 2);
  if (b.dataset.ol === 'copy') { await copyText(md()); toast('Outline copied as Markdown'); }
  if (b.dataset.ol === 'dl') downloadText(`hatrack-outline-${slug(cur() ? A[cur()].name : 'all')}-${todayStr()}.md`, md(), 'text/markdown');
  if (b.dataset.ol === 'print') window.print();
}

/* ---------- outline drag & drop: nest tasks, reorder, move subnotes ---------- */
let odrag = null;
function olClear() { $$('.drop-before, .drop-after, .nest-target, .ol-h.is-over, .is-dragging').forEach(x => x.classList.remove('drop-before', 'drop-after', 'nest-target', 'is-over', 'is-dragging')); }
function onOutlineDragStart(e) {
  if (U.view !== 'outline') return;
  const sub = e.target.closest?.('.ol-sub');
  if (sub) {
    const tid = sub.closest('.ol-item').dataset.id; const s = TASK[tid]?.subnotes.find(x => x.id === sub.dataset.sid); if (!s) return;
    odrag = { kind: 'sub', taskId: tid, sid: s.id };
    e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', s.text); } catch (_) { }
    setTimeout(() => sub.classList.add('is-dragging'), 0); e.stopPropagation(); return;
  }
  const row = e.target.closest?.('.ol-row'); if (!row) return;
  const id = row.closest('.ol-item').dataset.id;
  const top = topmost((sel.has(id) ? [...sel] : [id]).map(i => TASK[i]).filter(Boolean));
  odrag = { kind: 'task', ids: top.map(t => t.id), all: new Set(withDescendants(top).map(t => t.id)) };
  e.dataTransfer.effectAllowed = 'copyMove'; try { e.dataTransfer.setData('text/plain', tasksAsText(top)); } catch (_) { }
  setTimeout(() => top.forEach(t => $(`.ol-item[data-id="${CSS.escape(t.id)}"]`)?.classList.add('is-dragging')), 0);
}
function olTarget(e) {
  if (!odrag) return { mode: 'none' };
  const h = e.target.closest?.('.ol-h[data-area]');
  if (h) return { mode: 'area', areaId: h.dataset.area || null, el: h };
  const row = e.target.closest?.('.ol-row'); if (!row) return { mode: 'none' };
  const id = row.closest('.ol-item').dataset.id; const tgt = TASK[id]; if (!tgt) return { mode: 'none' };
  if (odrag.kind === 'sub') {
    const se = e.target.closest('.ol-sub');
    if (se && se.closest('.ol-row') === row) { const r = se.getBoundingClientRect(); const after = e.clientY > r.top + r.height / 2; return { mode: 'subpos', taskId: id, refSid: se.dataset.sid, after, el: se }; }
    return { mode: 'subinto', taskId: id, el: row };
  }
  if (odrag.all.has(id)) return { mode: 'none' };
  const r = row.getBoundingClientRect(); const edge = Math.min(r.height * 0.3, 14);
  let mode = e.clientY < r.top + edge ? 'before' : e.clientY > r.bottom - edge ? 'after' : 'nest';
  const moving = odrag.ids.map(i => TASK[i]);
  if (mode === 'nest' && !moving.every(m => canNest(m, tgt))) return { mode: 'none' };
  if (mode !== 'nest') { const p = parentOf(tgt); if (p && !moving.every(m => canNest(m, p))) return { mode: 'none' }; }
  return { mode, id, el: row };
}
function onOutlineDragOver(e) {
  if (U.view !== 'outline' || !odrag) return;
  autoScroll(e);
  const d = olTarget(e);
  $$('.drop-before, .drop-after, .nest-target, .ol-h.is-over').forEach(x => x !== d.el && x.classList.remove('drop-before', 'drop-after', 'nest-target', 'is-over'));
  if (d.mode === 'none') return;
  e.preventDefault();
  const copy = odrag.kind === 'task' && (U.copyDrop || e.altKey || e.ctrlKey || e.metaKey);
  try { e.dataTransfer.dropEffect = copy ? 'copy' : 'move'; } catch (_) { }
  d.el.classList.remove('drop-before', 'drop-after', 'nest-target', 'is-over');
  if (d.mode === 'area') d.el.classList.add('is-over');
  else if (d.mode === 'nest' || d.mode === 'subinto') { d.el.classList.add('nest-target'); d.el.dataset.nestLabel = d.mode === 'subinto' ? 'Add as a subnote here' : copy ? 'Copy here as a subtask' : 'Make it a subtask'; }
  else if (d.mode === 'before' || (d.mode === 'subpos' && !d.after)) d.el.classList.add('drop-before');
  else d.el.classList.add('drop-after');
}
function onOutlineDrop(e) {
  if (U.view !== 'outline' || !odrag) return;
  const d = olTarget(e); const g = odrag; odrag = null; olClear();
  if (d.mode === 'none') return;
  e.preventDefault();
  const copy = g.kind === 'task' && (U.copyDrop || e.altKey || e.ctrlKey || e.metaKey);
  if (g.kind === 'task') {
    if (d.mode === 'nest') return nestTasks(g.ids, d.id, copy);
    if (d.mode === 'area') return moveToArea(g.ids, d.areaId);
    return placeSiblings(g.ids, d.id, d.mode === 'after', copy);
  }
  // a subnote
  const from = TASK[g.taskId]; const si = from?.subnotes.findIndex(x => x.id === g.sid); if (!from || si < 0) return;
  const s = from.subnotes[si];
  if (d.mode === 'area') {
    mutate('Subnote → task', () => { from.subnotes.splice(si, 1); D.tasks.push(newTask({ title: s.text || 'Untitled', notes: s.note || '', areaId: d.areaId, statusId: s.done ? doneStatus() : defaultStatus() })); from.updated = now(); }, { toast: `“${s.text}” is now its own task in ${d.areaId ? A[d.areaId].name : 'Unsorted'}` });
    return;
  }
  const to = TASK[d.taskId];
  mutate('Move subnote', () => {
    from.subnotes.splice(si, 1);
    let at = to.subnotes.length;
    if (d.mode === 'subpos') { const ri = to.subnotes.findIndex(x => x.id === d.refSid); if (ri >= 0) at = ri + (d.after ? 1 : 0); }
    to.subnotes.splice(at, 0, s); from.updated = to.updated = now();
  }, from !== to ? { toast: `Moved the subnote to “${to.title}”` } : {});
}

/* ---------- reports ---------- */
function barsHTML(rows, opts = {}) {
  const max = Math.max(1, ...rows.map(r => r.n));
  if (!rows.some(r => r.n)) return '<p class="muted sm">Nothing to show yet.</p>';
  return `<div class="bars">${rows.map(r => `<div class="bar" style="--c:${r.color || 'var(--accent)'}"><span class="lbl" title="${esc(r.label)}">${r.drill ? `<button class="t" data-rdrill="${r.drill}" style="border:0;background:none;padding:0;color:inherit;font:inherit;cursor:pointer;text-decoration:underline;text-decoration-color:var(--line)">${esc(r.label)}</button>` : esc(r.label)}</span><span class="track"><span class="fill" style="display:block;width:${(r.n / max) * 100}%"></span></span><span class="val">${r.n}${opts.hours && r.min ? ' · ' + fmtHours(r.min) : ''}</span></div>`).join('')}</div>`;
}
function rlist(list, fmt) {
  if (!list.length) return '<p class="muted sm">None.</p>';
  return `<ul class="rlist">${list.map(t => `<li data-id="${t.id}"><button class="t" data-open>${T[t.typeId]?.icon ? esc(T[t.typeId].icon) + ' ' : ''}${esc(t.title)}</button><span class="d">${fmt(t)}</span></li>`).join('')}</ul>`;
}
function reportData() {
  const c = cur(); const scope = scopeTasks(); const open = scope.filter(t => !isDone(t)); const td = todayStr(); const eow = endOfWeek(td);
  const sum = l => l.reduce((s, t) => s + (+t.duration || 0), 0);
  const unsorted = open.filter(t => isRootTask(t) && (c ? t.areaId === c : !t.areaId));
  const groups = [{ label: c ? 'Not yet sorted' : 'Unsorted', color: 'var(--muted)', list: unsorted }, ...kids(c).map(a => ({ label: a.name, color: areaColor(a.id), list: open.filter(t => inSubtree(t.areaId, a.id)), drill: a.id }))];
  return {
    c, scope, open, td, eow, unsorted,
    overdue: open.filter(t => t.due && t.due < td).sort((a, b) => a.due.localeCompare(b.due)),
    week: open.filter(t => t.due && t.due >= td && t.due <= eow),
    upcoming: open.filter(t => t.due && t.due >= td && t.due <= addDays(td, 14)).sort((a, b) => a.due.localeCompare(b.due) || prank(a) - prank(b)),
    est: sum(open), unest: open.filter(t => !t.duration).length,
    rep: open.filter(t => t.repeat), done: scope.filter(isDone),
    groups: groups.map(g => ({ label: g.label, color: g.color, n: g.list.length, min: sum(g.list), drill: g.drill })),
    types: [...D.types.map(x => ({ label: `${x.icon ? x.icon + ' ' : ''}${x.name}`, n: open.filter(t => t.typeId === x.id).length })), { label: 'No type', n: open.filter(t => !T[t.typeId]).length }],
    pris: [...D.priorities.map(x => ({ label: x.name, color: x.color, n: open.filter(t => t.priorityId === x.id).length, min: sum(open.filter(t => t.priorityId === x.id)) })), { label: 'No priority', n: open.filter(t => !PR[t.priorityId]).length }],
    stats: D.statuses.map(x => ({ label: x.name, color: x.color, n: scope.filter(t => t.statusId === x.id).length })),
    repeats: open.filter(t => (t.seen || 1) > 1).sort((a, b) => b.seen - a.seen).slice(0, 12),
    stale: open.filter(t => now() - t.updated > 21 * 864e5).sort((a, b) => a.updated - b.updated).slice(0, 10),
    sources: Object.entries(open.reduce((m, t) => { const k = t.source || 'No source'; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n })),
  };
}
function renderReports() {
  const view = $('#view'); const r = reportData();
  const lvl = levelName(depthOf(r.c) + 1);
  const up = {}; r.upcoming.forEach(t => (up[t.due] ||= []).push(t));
  view.innerHTML = `<div class="reports">
    <div class="stats">
      <div class="stat"><div class="v">${r.open.length}</div><div class="l">Open tasks</div></div>
      <div class="stat${r.unsorted.length ? ' alert' : ''}"><div class="v">${r.unsorted.length}</div><div class="l">${r.c ? 'Not yet sorted here' : 'Unsorted'}</div></div>
      <div class="stat${r.overdue.length ? ' alert' : ''}"><div class="v">${r.overdue.length}</div><div class="l">Overdue</div></div>
      <div class="stat"><div class="v">${r.week.length}</div><div class="l">Due this week</div></div>
      <div class="stat"><div class="v">${fmtHours(r.est)}</div><div class="l">Estimated work${r.unest ? ` · ${r.unest} not estimated` : ''}</div></div>
      <div class="stat"><div class="v">${r.rep.length}</div><div class="l">Repeating</div></div>
      <div class="stat"><div class="v">${r.done.length}</div><div class="l">Done</div></div>
    </div>
    <div class="rp span2"><h3>Open work by ${esc(lvl.toLowerCase())}</h3>${barsHTML(r.groups, { hours: true })}</div>
    <div class="rp"><h3>Overdue</h3>${rlist(r.overdue.slice(0, 12), t => `${fmtDate(t.due)} · ${esc(pathStr(t.areaId) || 'Unsorted')}`)}</div>
    <div class="rp span2"><h3>Next 14 days</h3>${Object.keys(up).length ? Object.entries(up).map(([d, ts]) => `<div class="rp-date">${['Today', 'Tomorrow'].includes(fmtDate(d)) ? esc(fmtDate(d)) + ' — ' : ''}${esc(parseYMD(d).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }))}</div>${rlist(ts, t => esc(pathStr(t.areaId) || 'Unsorted') + (t.duration ? ' · ' + fmtDur(t.duration) : ''))}`).join('') : '<p class="muted sm">Nothing due in the next two weeks.</p>'}</div>
    <div class="rp"><h3>By priority</h3>${barsHTML(r.pris, { hours: true })}</div>
    <div class="rp"><h3>By type</h3>${barsHTML(r.types)}</div>
    <div class="rp"><h3>By status</h3>${barsHTML(r.stats)}</div>
    <div class="rp"><h3>Things you keep writing down</h3>${rlist(r.repeats, t => `noted ×${t.seen}`)}</div>
    <div class="rp"><h3>Untouched for 3+ weeks</h3>${rlist(r.stale, t => `updated ${esc(fmtDate(ymd(new Date(t.updated))))}`)}</div>
    <div class="rp"><h3>Where tasks came from</h3>${barsHTML(r.sources)}</div>
    <div class="rp"><h3>Share this report</h3><p class="muted sm" style="margin-top:0">A text summary of these numbers and the next two weeks.</p><div class="set-actions"><button class="btn" data-rp="copy">Copy as Markdown</button><button class="btn" data-rp="print">Print or save as PDF</button></div></div>
  </div>`;
}
function reportMarkdown() {
  const r = reportData();
  const L = [`# HatRack report — ${r.c ? pathStr(r.c) : 'whole rack'}`, `_${todayStr()}_`, '',
    `- Open tasks: ${r.open.length} (${fmtHours(r.est)} estimated${r.unest ? `, ${r.unest} not estimated` : ''})`, `- Unsorted: ${r.unsorted.length}`, `- Overdue: ${r.overdue.length}`, `- Due this week: ${r.week.length}`, `- Repeating: ${r.rep.length}`, '',
    `## Open work by ${levelName(depthOf(r.c) + 1).toLowerCase()}`, ...r.groups.map(g => `- ${g.label}: ${g.n}${g.min ? ` (${fmtHours(g.min)})` : ''}`), ''];
  if (r.overdue.length) L.push('## Overdue', ...r.overdue.map(t => `- [ ] ${t.title} — ${t.due} · ${pathStr(t.areaId) || 'Unsorted'}`), '');
  if (r.upcoming.length) L.push('## Next 14 days', ...r.upcoming.map(t => `- [ ] ${t.due} — ${t.title} · ${pathStr(t.areaId) || 'Unsorted'}`), '');
  return L.join('\n');
}
async function onReportEvent(e) {
  if (U.view !== 'reports' || e.type !== 'click') return;
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-open')) return openEditor(b.closest('[data-id]').dataset.id);
  if (b.dataset.rdrill) { U.cursor = b.dataset.rdrill; saveUI(); renderAll(); return; }
  if (b.dataset.rp === 'copy') { await copyText(reportMarkdown()); toast('Report copied as Markdown'); }
  if (b.dataset.rp === 'print') window.print();
}
