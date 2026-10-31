/* ============ HatRack — Configure (settings) ============ */

const SET_TABS = [['hierarchy', 'Groups & levels'], ['types', 'Task types'], ['priorities', 'Priorities'], ['statuses', 'Statuses'], ['durations', 'Durations'], ['fields', 'Custom fields'], ['data', 'Data & backup']];
let openAreaNotes = new Set(), cfgSnapEl = null;

function renderSettings() {
  const tab = U.settingsTab || 'hierarchy';
  $('#view').innerHTML = `<div class="settings"><nav class="set-nav" aria-label="Configure sections">${SET_TABS.map(([k, l]) => `<button data-tab="${k}" aria-current="${k === tab}">${l}</button>`).join('')}</nav>
    <section class="set-pane" id="set-pane">${paneHTML(tab)}</section></div>`;
}
function rerenderPane(focusSel) {
  const p = $('#set-pane'); if (!p) return;
  p.innerHTML = paneHTML(U.settingsTab);
  if (focusSel) { const el = $(focusSel); if (el) { el.focus(); el.select?.(); } }
}
function paneHTML(tab) {
  switch (tab) {
    case 'types': return paneTypes();
    case 'priorities': return panePriorities();
    case 'statuses': return paneStatuses();
    case 'durations': return paneDurations();
    case 'fields': return paneFields();
    case 'data': return paneData();
  }
  return paneHierarchy();
}
const ib = (op, label, sym, dis = false) => `<button class="icon-btn sm" data-op="${op}" title="${esc(label)}" aria-label="${esc(label)}" ${dis ? 'disabled' : ''}>${sym}</button>`;
function countBy(key) { const c = {}; D.tasks.forEach(t => { const v = t[key]; if (v) c[v] = (c[v] || 0) + 1; }); return c; }

function paneHierarchy() {
  const maxD = Math.max(3, ...D.areas.map(a => depthOf(a.id)));
  const cnt = {}; D.tasks.forEach(t => ancestors(t.areaId).forEach(a => { cnt[a.id] = (cnt[a.id] || 0) + 1; }));
  const rows = areaTreeFlat().map(({ a, d }) => {
    const sibs = kids(a.parentId); const si = sibs.indexOf(a);
    return `<div data-kind="areas" data-id="${a.id}"><div class="srow"><span class="tree-pad" style="width:${d * 24}px"></span><span class="lvl-tag">${esc(levelName(d + 1))}</span>
      <input type="color" data-k="color" value="${areaColor(a.id) || '#64748B'}" aria-label="Color for ${esc(a.name)}">
      <input class="inp grow" data-k="name" value="${esc(a.name)}" aria-label="Name">
      <input class="inp kw" data-k="keywords" value="${esc(a.keywords || '')}" placeholder="Auto-sort keywords, comma separated" aria-label="Keywords for ${esc(a.name)}">
      <span class="cnt">${plural(cnt[a.id] || 0, 'task')}</span>
      ${ib('notes', 'Notes', a.notes ? '✎•' : '✎')}${ib('up', 'Move up', '↑', si === 0)}${ib('down', 'Move down', '↓', si === sibs.length - 1)}
      ${ib('out', 'Move out one level', '⇤', !a.parentId)}${ib('in', 'Move inside the one above', '⇥', si === 0)}
      ${ib('add', `Add ${aAn(levelName(d + 2).toLowerCase())} inside`, '＋')}${ib('del', 'Delete', '✕')}</div>
      ${openAreaNotes.has(a.id) || a.notes ? `<textarea class="inp area-notes" data-k="notes" rows="2" placeholder="Notes about ${esc(a.name)} — shown in the outline" style="margin-left:${d * 24 + 6}px;width:calc(100% - ${d * 24 + 6}px)">${esc(a.notes || '')}</textarea>` : ''}</div>`;
  }).join('');
  return `<div class="pane-head"><h2>Groups & levels</h2><button class="help-link" data-guide="admin-groups">How this works</button></div>
    <p>Your ${esc(pluralize(levelName(1).toLowerCase()))} — each business, organization, obligation or “Personal” — and the ${esc(pluralize(levelName(2).toLowerCase()))} and ${esc(pluralize(levelName(3).toLowerCase()))} inside them. Keywords auto-sort imported notes: a note that mentions “wholesale” lands in the group with that keyword (the deepest match wins). Group names count as keywords too.</p>
    <div class="srow" style="padding-left:0"><span class="muted sm" style="min-width:86px">Level names</span>${Array.from({ length: maxD }, (_, i) => `<input class="inp" data-lvl="${i}" value="${esc(levelName(i + 1))}" style="width:140px" aria-label="Name for level ${i + 1}">`).join('<span class="muted">›</span>')}</div>
    <div class="rows" style="margin-top:10px">${rows || '<p class="muted">No groups yet — add your first one.</p>'}</div>
    <div class="set-actions"><button class="btn primary" data-add="areas">+ Add ${esc(levelName(1).toLowerCase())}</button></div>`;
}
function paneTypes() {
  const cnt = countBy('typeId');
  return `<div class="pane-head"><h2>Task types</h2><button class="help-link" data-guide="admin-types">How this works</button></div><p>What kind of note each item is. Keywords let the importer guess the type — “Remind me…” becomes a Reminder. A line starting with a type name and a colon (“Idea: …”) sets it too.</p>
    <div class="rows">${D.types.map((x, i) => `<div class="srow" data-kind="types" data-id="${x.id}">
      <input class="inp emoji" data-k="icon" value="${esc(x.icon || '')}" maxlength="4" aria-label="Icon" placeholder="🙂">
      <input type="color" data-k="color" value="${x.color || '#64748B'}" aria-label="Color">
      <input class="inp grow" data-k="name" value="${esc(x.name)}" aria-label="Name">
      <input class="inp kw" data-k="keywords" value="${esc(x.keywords || '')}" placeholder="Keywords, comma separated" aria-label="Keywords">
      <span class="cnt">${plural(cnt[x.id] || 0, 'task')}</span>${ib('up', 'Move up', '↑', i === 0)}${ib('down', 'Move down', '↓', i === D.types.length - 1)}${ib('del', 'Delete', '✕')}</div>`).join('')}</div>
    <div class="set-actions"><button class="btn primary" data-add="types">+ Add type</button></div>`;
}
function panePriorities() {
  const cnt = countBy('priorityId');
  return `<div class="pane-head"><h2>Priorities</h2><button class="help-link" data-guide="admin-priorities">How this works</button></div><p>Top of the list is most important. <code>!1</code> in a note means the first one. The Todoist export spreads these across p1–p4.</p>
    <div class="rows">${D.priorities.map((x, i) => `<div class="srow" data-kind="priorities" data-id="${x.id}">
      <span class="lvl-tag" style="min-width:24px">!${i + 1}</span><input type="color" data-k="color" value="${x.color || '#64748B'}" aria-label="Color">
      <input class="inp grow" data-k="name" value="${esc(x.name)}" aria-label="Name">
      <span class="cnt">${plural(cnt[x.id] || 0, 'task')}</span>${ib('up', 'Move up', '↑', i === 0)}${ib('down', 'Move down', '↓', i === D.priorities.length - 1)}${ib('del', 'Delete', '✕')}</div>`).join('')}</div>
    <div class="set-actions"><button class="btn primary" data-add="priorities">+ Add priority</button></div>`;
}
function paneStatuses() {
  const cnt = countBy('statusId');
  return `<div class="pane-head"><h2>Statuses</h2><button class="help-link" data-guide="admin-statuses">How this works</button></div><p>Your workflow. Statuses marked “counts as done” are hidden by the Open filter. Marking a repeating task done schedules its next date instead.</p>
    <div class="rows">${D.statuses.map((x, i) => `<div class="srow" data-kind="statuses" data-id="${x.id}">
      <input type="color" data-k="color" value="${x.color || '#64748B'}" aria-label="Color">
      <input class="inp grow" data-k="name" value="${esc(x.name)}" aria-label="Name">
      <label class="chk sm"><input type="checkbox" data-k="done" ${x.done ? 'checked' : ''}> Counts as done</label>
      <span class="cnt">${plural(cnt[x.id] || 0, 'task')}</span>${ib('up', 'Move up', '↑', i === 0)}${ib('down', 'Move down', '↓', i === D.statuses.length - 1)}${ib('del', 'Delete', '✕')}</div>`).join('')}</div>
    <div class="set-actions"><button class="btn primary" data-add="statuses">+ Add status</button></div>`;
}
function paneDurations() {
  return `<div class="pane-head"><h2>Durations</h2><button class="help-link" data-guide="admin-durations">How this works</button></div><p>The time estimates you pick from. When the board is grouped by duration, each one is a column and a task lands in the smallest one that fits.</p>
    <div class="chips">${durPresets().map(m => `<span class="chip">${fmtDur(m)}<button data-durdel="${m}" aria-label="Remove ${fmtDur(m)}">✕</button></span>`).join('')}</div>
    <div class="set-actions"><input class="inp" id="dur-new" placeholder="e.g. 45m, 3h, 2d" style="width:160px"><button class="btn primary" data-durop="add">Add</button><button class="btn ghost" data-durop="reset">Reset to defaults</button></div>`;
}
function paneFields() {
  return `<div class="pane-head"><h2>Custom fields</h2><button class="help-link" data-guide="admin-fields">How this works</button></div><p>Track anything else — client, energy level, location, cost. Dropdown fields can become board columns or rows.</p>
    <div class="rows">${D.fields.map(f => `<div class="srow" data-kind="fields" data-id="${f.id}">
      <input class="inp grow" data-k="name" value="${esc(f.name)}" aria-label="Field name">
      <select class="inp" data-k="kind" aria-label="Field type">${[['text', 'Text'], ['number', 'Number'], ['date', 'Date'], ['select', 'Dropdown'], ['checkbox', 'Checkbox']].map(o => opt(o[0], o[1], f.kind)).join('')}</select>
      ${f.kind === 'select' ? `<input class="inp kw" data-k="options" value="${esc((f.options || []).join(', '))}" placeholder="Options, comma separated" aria-label="Options">` : ''}
      ${ib('del', 'Delete', '✕')}</div>`).join('') || '<p class="muted">No custom fields yet.</p>'}</div>
    <div class="set-actions"><button class="btn primary" data-add="fields">+ Add field</button></div>`;
}
function paneData() {
  let kb = 0; try { kb = Math.round((localStorage.getItem(LS_KEY) || '').length / 1024); } catch (e) { }
  const files = D.tasks.reduce((n, t) => n + t.attachments.filter(a => a.kind === 'file').length, 0);
  return `<div class="pane-head"><h2>Data & backup</h2><button class="help-link" data-guide="admin-data">How this works</button></div><p>HatRack keeps everything in this browser on this device — there is no account and no server. Download a backup now and then, and use it to move to another computer or browser.</p>
    <p class="muted sm">${plural(D.tasks.length, 'task')} in ${plural(D.areas.length, 'group')} · about ${kb} KB${files ? ` · ${plural(files, 'stored file')}` : ''}</p>
    <h3>Back up</h3><div class="set-actions"><button class="btn primary" data-data="backup">Download backup</button><label class="chk sm"><input type="checkbox" id="bk-files" ${files ? 'checked' : ''}> Include stored attachment files</label></div>
    <h3>Share your setup</h3><div class="set-actions"><button class="btn" data-data="template">Download setup template</button><span class="muted sm">Groups, levels, keywords, types, priorities, statuses, durations and fields — no tasks. Others load it with Restore.</span></div>
    <h3>Restore</h3><div class="set-actions"><label class="btn" style="cursor:pointer">Restore from a backup…<input type="file" id="bk-restore" accept=".json,application/json" hidden></label><span class="muted sm">Load a backup or a setup template. You’ll choose whether to merge or replace.</span></div>
    <h3>Sample data</h3><div class="set-actions"><button class="btn" data-data="sample">Add the sample rack</button><span class="muted sm">Four example businesses and obligations with tasks to sort.</span></div>
    <h3>Start over</h3><div class="set-actions"><button class="btn danger" data-data="wipe">Delete everything</button></div>
    <p class="muted sm" style="margin-top:22px">HatRack ${APP_VERSION} · a single-file app you can host free on GitHub Pages.</p>`;
}

/* ---------- events ---------- */
function onSettingsFocus(e) {
  if (U.view !== 'settings') return;
  const el = e.target; if (!el.closest('#set-pane') || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.type === 'file') return;
  if (cfgSnapEl !== el) { snapshot('Edit settings'); cfgSnapEl = el; }
}
function cfgItem(el) { const row = el.closest('[data-kind]'); if (!row) return null; const list = D[row.dataset.kind]; return { row, kind: row.dataset.kind, list, item: list.find(x => x.id === row.dataset.id) }; }
function onSettingsInput(e) {
  if (U.view !== 'settings') return;
  const el = e.target;
  if (el.dataset.lvl !== undefined) { D.levelNames[+el.dataset.lvl] = el.value.trim() || `Level ${+el.dataset.lvl + 1}`; save(); return; }
  const c = cfgItem(el); if (!c || !c.item || !el.dataset.k) return;
  const k = el.dataset.k;
  if (el.type === 'checkbox') c.item[k] = el.checked;
  else if (k === 'options') c.item.options = [...new Set(el.value.split(',').map(s => s.trim()).filter(Boolean))];
  else if (k === 'name') c.item.name = el.value.trim() || 'Untitled';
  else c.item[k] = el.value;
  reindex(); save();
}
function onSettingsChange(e) {
  if (U.view !== 'settings') return;
  const el = e.target;
  if (el.id === 'bk-restore') { const f = el.files?.[0]; el.value = ''; if (f) restoreBackup(f); return; }
  if (el.dataset.k === 'kind' || el.dataset.k === 'done' || el.dataset.k === 'color' || el.dataset.lvl !== undefined) {
    if (el.dataset.k === 'done' && !D.statuses.some(s => !s.done)) { el.checked = false; cfgItem(el).item.done = false; toast('Keep at least one status that isn’t done.'); }
    reindex(); save(); rerenderPane();
  }
  renderToolbar(); renderHeader(); cfgSnapEl = null;
}
async function onSettingsClick(e) {
  if (U.view !== 'settings') return;
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tab) { U.settingsTab = b.dataset.tab; saveUI(); renderSettings(); return; }
  if (b.dataset.add) return addConfigItem(b.dataset.add);
  if (b.dataset.durdel) { mutate('Remove duration', () => { D.durations = D.durations.filter(m => +m !== +b.dataset.durdel); }); return; }
  if (b.dataset.durop === 'add') { const m = parseDuration($('#dur-new').value); if (!m) { toast('Try something like 45m, 1h30m or 2d.'); return; } mutate('Add duration', () => { if (!D.durations.includes(m)) D.durations.push(m); }); return; }
  if (b.dataset.durop === 'reset') { mutate('Reset durations', () => { D.durations = defaultData().durations; }); return; }
  if (b.dataset.data) return dataAction(b.dataset.data);
  const op = b.dataset.op; if (!op) return;
  const c = cfgItem(b); if (!c || !c.item) return;
  if (c.kind === 'areas') return areaOp(op, c.item);
  const i = c.list.indexOf(c.item);
  if (op === 'up' && i > 0) mutate('Reorder', () => { c.list.splice(i, 1); c.list.splice(i - 1, 0, c.item); });
  if (op === 'down' && i < c.list.length - 1) mutate('Reorder', () => { c.list.splice(i, 1); c.list.splice(i + 1, 0, c.item); });
  if (op === 'del') await deleteConfigItem(c.kind, c.item);
}
async function addConfigItem(kind) {
  if (kind === 'areas') { const id = uid('ar'); mutate('Add group', () => { D.areas.push({ id, name: `New ${levelName(1).toLowerCase()}`, parentId: null, color: nextColor(), keywords: '', notes: '', order: kids(null).length }); }); rerenderPane(`[data-id="${id}"] [data-k="name"]`); return; }
  const id = uid(kind.slice(0, 2));
  mutate('Add', () => {
    if (kind === 'types') D.types.push({ id, name: 'New type', icon: '', color: PALETTE[D.types.length % PALETTE.length], keywords: '' });
    if (kind === 'priorities') D.priorities.push({ id, name: 'New priority', color: '#64748B' });
    if (kind === 'statuses') { const di = D.statuses.findIndex(s => s.done); const s = { id, name: 'New status', color: PALETTE[D.statuses.length % PALETTE.length], done: false }; di < 0 ? D.statuses.push(s) : D.statuses.splice(di, 0, s); }
    if (kind === 'fields') D.fields.push({ id, name: 'New field', kind: 'text', options: [] });
  });
  rerenderPane(`[data-id="${id}"] [data-k="name"]`);
}
async function deleteConfigItem(kind, item) {
  const field = { types: 'typeId', priorities: 'priorityId', statuses: 'statusId' }[kind];
  const n = field ? D.tasks.filter(t => t[field] === item.id).length : D.tasks.filter(t => t.custom && item.id in t.custom).length;
  if (kind === 'statuses') {
    if (!item.done && D.statuses.filter(s => !s.done).length <= 1) { toast('Keep at least one status that isn’t done.'); return; }
    if (D.statuses.length <= 1) { toast('Keep at least one status.'); return; }
  }
  const what = kind === 'fields' ? `Its values on ${plural(n, 'task')} will be removed.` : n ? `${plural(n, 'task')} ${n === 1 ? 'uses' : 'use'} it and will be cleared${kind === 'statuses' ? ' back to the first status' : ''}.` : 'No tasks use it.';
  if (!(await confirmBox(`Delete “${item.name}”?`, esc(what), 'Delete', true))) return;
  mutate(`Delete ${item.name}`, () => {
    D[kind] = D[kind].filter(x => x !== item); reindex();
    if (kind === 'statuses') { const alt = item.done ? D.statuses.find(s => s.done)?.id : null; D.tasks.forEach(t => { if (t.statusId === item.id) t.statusId = alt || defaultStatus(); }); }
    else if (field) D.tasks.forEach(t => { if (t[field] === item.id) t[field] = null; });
    if (kind === 'fields') { D.tasks.forEach(t => { if (t.custom) delete t.custom[item.id]; }); if (U.group === 'cf:' + item.id) U.group = 'area'; if (U.lanes === 'cf:' + item.id) U.lanes = 'none'; saveUI(); }
  });
}
async function areaOp(op, a) {
  const sibs = kids(a.parentId); const si = sibs.indexOf(a);
  const reorder = (list) => list.forEach((x, i) => { x.order = i; });
  if (op === 'notes') { openAreaNotes.add(a.id); rerenderPane(`[data-id="${a.id}"] [data-k="notes"]`); return; }
  if (op === 'up' && si > 0) return mutate('Reorder', () => { sibs.splice(si, 1); sibs.splice(si - 1, 0, a); reorder(sibs); });
  if (op === 'down' && si < sibs.length - 1) return mutate('Reorder', () => { sibs.splice(si, 1); sibs.splice(si + 1, 0, a); reorder(sibs); });
  if (op === 'in' && si > 0) { const p = sibs[si - 1]; return mutate('Move inside', () => { a.parentId = p.id; a.order = kids(p.id).length; if (a.color === areaColor(p.id)) a.color = ''; }); }
  if (op === 'out' && a.parentId) {
    const p = A[a.parentId];
    return mutate('Move out', () => { a.parentId = p.parentId || null; if (!a.parentId && !a.color) a.color = areaColor(p.id) || nextColor(); const list = kids(p.parentId).filter(x => x !== a); list.splice(list.indexOf(p) + 1, 0, a); reorder(list); });
  }
  if (op === 'add') { const id = uid('ar'); const d = depthOf(a.id); mutate('Add group', () => { D.areas.push({ id, name: `New ${levelName(d + 1).toLowerCase()}`, parentId: a.id, color: '', keywords: '', notes: '', order: kids(a.id).length }); }); rerenderPane(`[data-id="${id}"] [data-k="name"]`); return; }
  if (op === 'del') {
    const sub = descendants(a.id).length; const n = D.tasks.filter(t => t.areaId === a.id).length;
    const dest = a.parentId ? `“${A[a.parentId].name}”` : 'Unsorted';
    if ((n || sub) && !(await confirmBox(`Delete “${a.name}”?`, `${n ? `Its ${plural(n, 'task')} move to ${esc(dest)}. ` : ''}${sub ? `Its ${plural(sub, 'sub-group')} move up a level.` : ''}`, 'Delete', true))) return;
    mutate(`Delete ${a.name}`, () => {
      D.tasks.forEach(t => { if (t.areaId === a.id) t.areaId = a.parentId || null; });
      D.areas.forEach(x => { if (x.parentId === a.id) { x.parentId = a.parentId || null; if (!x.parentId && !x.color) x.color = areaColor(a.id) || nextColor(); } });
      D.areas = D.areas.filter(x => x !== a);
      if (U.cursor === a.id) { U.cursor = a.parentId || null; saveUI(); }
    });
  }
}

/* ---------- data: backup / restore / wipe ---------- */
async function dataAction(a) {
  if (a === 'backup') return downloadBackup($('#bk-files')?.checked);
  if (a === 'template') return downloadTemplate();
  if (a === 'sample') return loadSample();
  if (a === 'wipe') {
    if (!(await confirmBox('Delete everything?', 'All tasks, groups and settings in this browser will be removed. Undo works until you close the tab — download a backup first if you might want them back.', 'Delete everything', true))) return;
    mutate('Delete everything', () => { D = defaultData(); U.cursor = null; sel.clear(); });
    saveUI(); toast('Everything deleted', { undo: true });
  }
}
async function downloadBackup(withFiles) {
  const out = clone(D); out.exportedAt = new Date().toISOString();
  if (withFiles) {
    out.files = {};
    const ids = new Set(); D.tasks.forEach(t => t.attachments.forEach(x => x.fileId && ids.add(x.fileId)));
    for (const id of ids) {
      try { const rec = await FileStore.get(id); if (rec?.blob) out.files[id] = { name: rec.name, type: rec.type, size: rec.size, data: await blobToDataURL(rec.blob) }; } catch (e) { }
    }
  }
  downloadText(`hatrack-backup-${todayStr()}.json`, JSON.stringify(out), 'application/json');
  toast('Backup downloaded');
}
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
/** a setup template: everything in Configure, no tasks — for handing a standard structure to a team */
function downloadTemplate() {
  const out = clone(D); out.tasks = []; out.kind = 'hatrack-setup'; out.exportedAt = new Date().toISOString();
  downloadText(`hatrack-setup-${todayStr()}.json`, JSON.stringify(out, null, 2), 'application/json');
  toast('Setup template downloaded — share it, then load it with Restore');
}
/** add groups, types, priorities, statuses and fields that aren't here yet (matched by ID or name); returns ID maps */
function mergeConfig(inc) {
  const maps = { areas: new Map(), types: new Map(), priorities: new Map(), statuses: new Map(), fields: new Map() };
  for (const k of ['types', 'priorities', 'statuses', 'fields']) {
    for (const x of inc[k] || []) {
      const hit = D[k].find(y => y.id === x.id) || D[k].find(y => norm(y.name) === norm(x.name));
      if (hit) {
        maps[k].set(x.id, hit.id);
        if (k === 'fields' && x.kind === 'select' && hit.kind === 'select') hit.options = [...new Set([...(hit.options || []), ...(x.options || [])])];
        if (k === 'types' && x.keywords) hit.keywords = [...new Set([...kwList(hit.keywords), ...kwList(x.keywords)])].join(', ');
      } else { D[k].push(x); maps[k].set(x.id, x.id); }
    }
  }
  const incA = inc.areas || []; const byId = Object.fromEntries(incA.map(a => [a.id, a]));
  const depth = a => { let d = 0, p = byId[a.parentId], g = 0; while (p && g++ < 64) { d++; p = byId[p.parentId]; } return d; };
  incA.slice().sort((a, b) => depth(a) - depth(b) || (a.order ?? 0) - (b.order ?? 0)).forEach(a => {
    const pid = a.parentId ? maps.areas.get(a.parentId) || null : null;
    const hit = D.areas.find(y => y.id === a.id) || D.areas.find(y => (y.parentId || null) === pid && norm(y.name) === norm(a.name));
    if (hit) {
      maps.areas.set(a.id, hit.id);
      if (a.keywords) hit.keywords = [...new Set([...kwList(hit.keywords), ...kwList(a.keywords)])].join(', ');
      if (!hit.notes && a.notes) hit.notes = a.notes;
    } else { const n = { ...a, parentId: pid, order: D.areas.filter(y => (y.parentId || null) === pid).length }; D.areas.push(n); maps.areas.set(a.id, n.id); }
  });
  if (Array.isArray(inc.levelNames) && JSON.stringify(D.levelNames) === JSON.stringify(defaultData().levelNames)) D.levelNames = inc.levelNames.slice();
  D.durations = [...new Set([...D.durations, ...(inc.durations || [])].map(Number))];
  return maps;
}
async function restoreBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch (e) { toast('That file isn’t valid JSON.'); return; }
  if (!data || !Array.isArray(data.tasks)) { toast('That doesn’t look like a HatRack backup.'); return; }
  const isTemplate = data.kind === 'hatrack-setup' || (!data.tasks.length && (data.areas || []).length);
  const choice = await new Promise(res => {
    let done = false;
    const m = openModal(isTemplate ? {
      title: 'Apply setup template',
      body: `<p style="margin:0">This template has ${plural((data.areas || []).length, 'group')}, ${plural((data.types || []).length, 'task type')}, ${plural((data.priorities || []).length, 'priority', 'priorities')}, ${plural((data.statuses || []).length, 'status', 'statuses')} and ${plural((data.fields || []).length, 'custom field')}.</p><p>Applying adds anything you don’t have yet — matched by name — and keeps all your tasks.</p>`,
      foot: `<button class="btn" data-close>Cancel</button><button class="btn primary" data-c="merge">Apply setup</button>`, onClose: () => { if (!done) res(null); },
    } : {
      title: 'Restore backup',
      body: `<p style="margin:0">This backup has ${plural(data.tasks.length, 'task')} and ${plural((data.areas || []).length, 'group')}${data.files ? ` plus ${plural(Object.keys(data.files).length, 'stored file')}` : ''}.</p><p>Merge keeps what you have and adds anything missing (groups and types with the same name are combined). Replace swaps everything for the backup.</p>`,
      foot: `<button class="btn" data-close>Cancel</button><button class="btn" data-c="merge">Merge</button><button class="btn danger" data-c="replace">Replace everything</button>`, onClose: () => { if (!done) res(null); },
    });
    m.addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) { done = true; m.close(); res(b.dataset.c); } });
  });
  if (!choice) return;
  const files = data.files; delete data.files; delete data.kind;
  if (files) for (const [id, f] of Object.entries(files)) { try { const blob = await (await fetch(f.data)).blob(); await FileStore.put(id, { name: f.name, type: f.type, size: f.size, blob }); } catch (e) { } }
  mutate(isTemplate ? 'Apply setup' : 'Restore backup', () => {
    if (choice === 'replace') { D = migrate(data); normalizeData(); U.cursor = null; return; }
    const inc = migrate(data);
    const maps = mergeConfig(inc);
    reindex();
    const have = new Set(D.tasks.map(t => t.id)); let ord = maxOrder();
    inc.tasks.forEach(t => {
      if (have.has(t.id)) return;
      t.areaId = maps.areas.get(t.areaId) || null; t.typeId = maps.types.get(t.typeId) || null;
      t.priorityId = maps.priorities.get(t.priorityId) || null; t.statusId = maps.statuses.get(t.statusId) || null;
      if (t.custom) t.custom = Object.fromEntries(Object.entries(t.custom).map(([k, v]) => [maps.fields.get(k) || k, v]));
      t.order = ++ord; D.tasks.push(t);
    });
    normalizeData();
  });
  saveUI(); toast(isTemplate ? 'Setup applied' : choice === 'replace' ? 'Backup restored' : 'Backup merged', { undo: true });
}
