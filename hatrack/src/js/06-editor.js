/* ============ HatRack — task editor drawer, modals, menus, toasts ============ */

let editingId = null, editDirty = false, openNoteSubs = new Set();

function openEditor(id, opts = {}) {
  if (!TASK[id]) return;
  if (editingId !== id) { editDirty = false; openNoteSubs = new Set(); }
  editingId = id; $('#drawer').hidden = false; renderDrawer();
  if (opts.focus === 'subtask') setTimeout(() => { const el = $('#ed-subtaskadd'); el?.scrollIntoView({ block: 'center' }); el?.focus(); }, 30);
  else if (TASK[id].title === 'Untitled') setTimeout(() => { const ti = $('#ed-title'); ti?.focus(); ti?.select(); }, 30);
}
function closeDrawer(silent) {
  const was = editingId; editingId = null; editDirty = false;
  const d = $('#drawer'); d.hidden = true; d.innerHTML = '';
  if (!silent && was) renderView();
}
let viewTimer = null;
function scheduleViewRender() { clearTimeout(viewTimer); viewTimer = setTimeout(() => { if (U.view !== 'settings') renderView(); renderHeader(); }, 260); }
/** edit the open task; one undo step per editing session */
function edit(fn, { drawer = false, view = true } = {}) {
  const t = TASK[editingId]; if (!t) return;
  if (!editDirty) { snapshot('Edit task'); editDirty = true; }
  const msg = fn(t); t.updated = now(); save();
  if (drawer) renderDrawer();
  if (view) scheduleViewRender();
  if (msg) toast(msg, { undo: true });
}
function autoGrow(el) { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

function renderDrawer() {
  const t = TASK[editingId]; const d = $('#drawer'); if (!t) { closeDrawer(true); return; }
  const scrollTop = $('.drawer-body', d)?.scrollTop || 0;
  const presets = durPresets();
  const durOpts = opt('', 'Not estimated', t.duration ? '' : '') + presets.map(m => opt(m, fmtDur(m), t.duration)).join('')
    + (t.duration && !presets.includes(+t.duration) ? opt(t.duration, fmtDur(t.duration), t.duration) : '') + opt('custom', 'Other…', '');
  const subDone = t.subnotes.filter(s => s.done).length;
  const cf = D.fields.map(f => {
    const v = t.custom?.[f.id];
    let input;
    if (f.kind === 'select') input = `<select class="inp" data-cf="${f.id}">${opt('', '—', v)}${(f.options || []).map(o => opt(o, o, v)).join('')}</select>`;
    else if (f.kind === 'checkbox') input = `<label class="chk"><input type="checkbox" data-cf="${f.id}" ${v ? 'checked' : ''}> Yes</label>`;
    else input = `<input class="inp" data-cf="${f.id}" type="${f.kind === 'number' ? 'number' : f.kind === 'date' ? 'date' : 'text'}" value="${esc(v ?? '')}">`;
    return `<label class="field"><span>${esc(f.name)}</span>${input}</label>`;
  }).join('');
  const parent = parentOf(t), kidsT = childrenOf(t.id), canAddKid = taskDepth(t) < MAX_NEST;
  const kidRows = kidsT.map(c => `
        <div class="st-row${isDone(c) ? ' done' : ''}" data-cid="${c.id}" style="${c.color ? `--cbg:${tintVar(c.color)}` : ''}">
          <input type="checkbox" data-st="done" ${isDone(c) ? 'checked' : ''} aria-label="Done">
          <button class="st-title" data-st="open" title="Open this subtask">${T[c.typeId]?.icon ? esc(T[c.typeId].icon) + ' ' : ''}${esc(c.title)}${childrenOf(c.id).length ? ` <span class="muted">· ${plural(taskDescendants(c).length, 'subtask')}</span>` : ''}</button>
          <span class="st-meta">${c.due ? esc(fmtDate(c.due)) : ''}${c.duration ? ' · ' + fmtDur(c.duration) : ''}</span>
          <button class="icon-btn sm" data-st="out" title="Make it a top-level task" aria-label="Make top-level">⇱</button>
          ${childrenOf(c.id).length ? '' : '<button class="icon-btn sm" data-st="tosub" title="Turn into a subnote" aria-label="Turn into a subnote">⇩</button>'}
          <button class="icon-btn sm" data-st="del" title="Delete subtask" aria-label="Delete subtask">✕</button></div>`).join('');
  d.innerHTML = `
  <div class="drawer-head"><span class="path" title="${esc(pathStr(t.areaId))}">${esc(pathStr(t.areaId) || 'Unsorted')}</span>
    <button class="icon-btn" data-ed="close" aria-label="Close editor" title="Close (Esc)">✕</button></div>
  <div class="drawer-body">
    ${parent ? `<div class="parent-line">Subtask of <button class="linkish" data-ed="openparent" title="Open the parent task">↰ ${esc(parent.title)}</button></div>` : ''}
    <textarea id="ed-title" class="title-inp" rows="1" aria-label="Task title">${esc(t.title)}</textarea>
    <label class="field"><span>Where it belongs</span>
      <select class="inp" id="ed-area">${opt('', 'Unsorted', t.areaId || '')}${areaTreeFlat().map(({ a, d }) => opt(a.id, ' '.repeat(d) + a.name, t.areaId)).join('')}</select></label>
    <div class="grid2">
      <label class="field"><span>Type</span><select class="inp" id="ed-type">${opt('', '—', t.typeId || '')}${D.types.map(x => opt(x.id, `${x.icon ? x.icon + ' ' : ''}${x.name}`, t.typeId)).join('')}</select></label>
      <label class="field"><span>Priority</span><select class="inp" id="ed-pri">${opt('', '—', t.priorityId || '')}${D.priorities.map(x => opt(x.id, x.name, t.priorityId)).join('')}</select></label>
      <label class="field"><span>Status</span><select class="inp" id="ed-status">${D.statuses.map(x => opt(x.id, x.name, t.statusId)).join('')}</select></label>
      <label class="field"><span>Estimated time</span><select class="inp" id="ed-dur">${durOpts}</select></label>
      <label class="field"><span>Due</span><input class="inp" type="date" id="ed-due" value="${esc(t.due || '')}"></label>
      <label class="field"><span>Repeats</span><select class="inp" id="ed-rep">${REPEATS.map(([k, l]) => opt(k, l, t.repeat)).join('')}</select></label>
      <label class="field"><span>Tags</span><input class="inp" id="ed-tags" value="${esc(t.tags.join(', '))}" placeholder="comma, separated"></label>
      <label class="field"><span>Source</span><input class="inp" id="ed-src" value="${esc(t.source)}" placeholder="Where this came from" list="ed-src-list"></label>
      ${cf}
    </div>
    <div class="field"><span>Card color</span><div class="swatches" role="radiogroup" aria-label="Card color">${CARD_COLORS.map(([k, l]) => `<button class="swb${(t.color || '') === k ? ' on' : ''}" role="radio" aria-checked="${(t.color || '') === k}" data-color="${k}" title="${l}" aria-label="${l}" style="--sw:${k ? tintVar(k) : 'var(--surface)'}"></button>`).join('')}</div></div>
    <datalist id="ed-src-list">${[...new Set(D.tasks.map(x => x.source).filter(Boolean))].slice(0, 40).map(s => `<option value="${esc(s)}">`).join('')}</datalist>
    <div class="sect"><h4>Notes</h4><textarea class="inp" id="ed-notes" rows="5" placeholder="Details, context, links…">${esc(t.notes)}</textarea></div>
    <div class="sect"><h4>Subtasks ${kidsT.length ? `<span class="muted">${kidsT.filter(isDone).length} of ${kidsT.length} done</span>` : ''}</h4>
      <div class="subs">${kidRows}</div>
      ${canAddKid ? '<input class="inp" id="ed-subtaskadd" placeholder="Add a subtask and press Enter — shortcuts work" style="width:100%;margin-top:6px">' : `<p class="meta-line">Subtasks go ${MAX_NEST} levels deep — this one is as deep as it goes.</p>`}
      <p class="meta-line">Subtasks are full tasks with their own dates and status. Tip: drag a card onto another card to nest it.</p></div>
    <div class="sect"><h4>Subnotes ${t.subnotes.length ? `<span class="muted">${subDone} of ${t.subnotes.length} done</span>` : ''}</h4>
      <div class="subs" id="ed-subs">${t.subnotes.map((s, i) => `
        <div class="sub${s.done ? ' done' : ''}" data-sid="${s.id}">
          <input type="checkbox" data-sub="done" ${s.done ? 'checked' : ''} aria-label="Done">
          <input class="inp" data-sub="text" value="${esc(s.text)}" aria-label="Subnote">
          <button class="icon-btn sm" data-sub="note" title="${s.note ? 'Edit note' : 'Add a note'}" aria-label="Note">${s.note ? '✎•' : '✎'}</button>
          <button class="icon-btn sm" data-sub="up" title="Move up" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
          ${canAddKid ? '<button class="icon-btn sm" data-sub="promote" title="Make it a subtask" aria-label="Make it a subtask">⇪</button>' : ''}
          <button class="icon-btn sm" data-sub="del" title="Remove" aria-label="Remove">✕</button>
          ${s.note || openNoteSubs.has(s.id) ? `<textarea class="inp sub-note" data-sub="notetext" rows="2" placeholder="Note for this subnote">${esc(s.note || '')}</textarea>` : ''}
        </div>`).join('')}</div>
      <input class="inp" id="ed-subadd" placeholder="Add a subnote and press Enter" style="width:100%;margin-top:6px"></div>
    <div class="sect"><h4>Attachments</h4>
      <div class="atts">${t.attachments.map(a => `
        <div class="att" data-aid="${a.id}"><span aria-hidden="true">${a.kind === 'link' ? '🔗' : '📄'}</span>
          <span class="nm">${a.kind === 'link' ? `<a href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.name || a.url)}</a>` : `<button class="btn ghost sm" data-att="open" style="padding:0">${esc(a.name)}</button>`}</span>
          <span class="muted sm">${a.size ? fmtBytes(a.size) : ''}</span>
          <button class="icon-btn sm" data-att="del" aria-label="Remove attachment">✕</button></div>`).join('') || '<p class="muted sm" style="margin:0">No attachments yet.</p>'}</div>
      <div class="set-actions"><button class="btn sm" data-ed="addlink">Add link</button><label class="btn sm" style="cursor:pointer">Add file<input type="file" id="ed-file" multiple hidden></label></div>
      <p class="meta-line">Links can point to Google Drive, Dropbox or anywhere. Files are stored in this browser only (no server) — export a backup with files to move them.</p></div>
    <p class="meta-line">Created ${esc(new Date(t.created).toLocaleString())} · Updated ${esc(new Date(t.updated).toLocaleString())}${(t.seen || 1) > 1 ? ` · Noted ${t.seen} times <button class="btn ghost sm" data-ed="resetseen">Reset count</button>` : ''}${t.doneCount ? ` · Completed ${t.doneCount}×` : ''}</p>
  </div>
  <div class="drawer-foot">
    <button class="btn primary" data-ed="done">${isDone(t) ? 'Reopen' : t.repeat ? 'Done — schedule next' : 'Mark done'}</button>
    <button class="btn" data-ed="dup">Duplicate</button><button class="btn" data-ed="copy" title="Copy as text with shortcuts">Copy</button>
    <span class="spacer"></span><button class="btn danger" data-ed="delete">Delete</button></div>`;
  requestAnimationFrame(() => { autoGrow($('#ed-title')); $$('.sub-note', d).forEach(autoGrow); });
  const body = $('.drawer-body', d); if (body) body.scrollTop = scrollTop;
}
const fmtBytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(0) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
const safeUrl = u => (/^(https?:|mailto:|tel:|ftp:)/i.test(String(u || '')) ? u : (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u || '') ? 'https://' + u : '#'));

function onDrawerInput(e) {
  const el = e.target; const id = el.id;
  if (id === 'ed-title') { autoGrow(el); edit(t => { t.title = el.value.replace(/\n/g, ' ').trim() || 'Untitled'; }); return; }
  if (id === 'ed-notes') { edit(t => { t.notes = el.value; }); return; }
  if (id === 'ed-tags') { edit(t => { t.tags = el.value.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean); }); return; }
  if (id === 'ed-src') { edit(t => { t.source = el.value.trim(); }); return; }
  if (el.dataset.cf && el.type !== 'checkbox' && el.tagName !== 'SELECT') { edit(t => { if (el.value === '') delete t.custom[el.dataset.cf]; else t.custom[el.dataset.cf] = el.value; }); return; }
  const sub = el.closest('[data-sid]');
  if (sub && el.dataset.sub === 'text') { edit(t => { const s = t.subnotes.find(x => x.id === sub.dataset.sid); if (s) s.text = el.value; }); return; }
  if (sub && el.dataset.sub === 'notetext') { autoGrow(el); edit(t => { const s = t.subnotes.find(x => x.id === sub.dataset.sid); if (s) s.note = el.value; }); }
}
async function onDrawerChange(e) {
  const el = e.target; const id = el.id;
  if (id === 'ed-area') return edit(t => { const was = !!parentOf(t); if (was && (el.value || null) !== t.areaId) t.parentId = null; setAreaDeep(t, el.value || null); return was && !t.parentId ? 'Moved out of its parent task to the new group' : null; }, { drawer: true });
  if (id === 'ed-type') return edit(t => { t.typeId = el.value || null; });
  if (id === 'ed-pri') return edit(t => { t.priorityId = el.value || null; });
  if (id === 'ed-status') return edit(t => setStatus(t, el.value), { drawer: true });
  if (id === 'ed-due') return edit(t => { t.due = el.value || null; });
  if (id === 'ed-rep') return edit(t => { t.repeat = el.value; if (t.repeat && !t.due) t.due = todayStr(); }, { drawer: true });
  if (id === 'ed-dur') {
    if (el.value === 'custom') {
      const r = await askFields('Estimated time', [{ key: 'v', label: 'How long?', placeholder: 'e.g. 45m, 1h30m, 3h, 2d' }]);
      const m = r && parseDuration(r.v);
      if (m) edit(t => { t.duration = m; }, { drawer: true }); else renderDrawer();
      return;
    }
    return edit(t => { t.duration = el.value ? +el.value : null; });
  }
  if (el.dataset.cf && (el.type === 'checkbox' || el.tagName === 'SELECT')) return edit(t => { const v = el.type === 'checkbox' ? el.checked : el.value; if (v === '' || v === false) delete t.custom[el.dataset.cf]; else t.custom[el.dataset.cf] = v; });
  if (id === 'ed-file') { await addFiles(Array.from(el.files || [])); el.value = ''; return; }
  const st = el.closest('[data-cid]');
  if (st && el.dataset.st === 'done') { const c = TASK[st.dataset.cid]; let msg; mutate(el.checked ? 'Mark done' : 'Reopen', () => { msg = setStatus(c, el.checked ? doneStatus() : defaultStatus()); c.updated = now(); }); renderDrawer(); if (msg) toast(msg, { undo: true }); return; }
  const sub = el.closest('[data-sid]');
  if (sub && el.dataset.sub === 'done') edit(t => { const s = t.subnotes.find(x => x.id === sub.dataset.sid); if (s) s.done = el.checked; }, { drawer: true });
}
async function onDrawerClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const t = TASK[editingId]; if (!t) return;
  const sub = b.closest('[data-sid]');
  if (sub) {
    const sid = sub.dataset.sid; const i = t.subnotes.findIndex(x => x.id === sid);
    if (b.dataset.sub === 'del') edit(t => { t.subnotes.splice(i, 1); }, { drawer: true });
    if (b.dataset.sub === 'up' && i > 0) edit(t => { const [s] = t.subnotes.splice(i, 1); t.subnotes.splice(i - 1, 0, s); }, { drawer: true });
    if (b.dataset.sub === 'note') { openNoteSubs.add(sid); renderDrawer(); $(`[data-sid="${sid}"] .sub-note`)?.focus(); }
    if (b.dataset.sub === 'promote') {
      const s = t.subnotes[i]; if (!s) return;
      mutate('Make subtask', () => { t.subnotes.splice(i, 1); D.tasks.push(newTask({ title: s.text || 'Untitled', notes: s.note || '', parentId: t.id, areaId: t.areaId, statusId: s.done ? doneStatus() : defaultStatus() })); t.updated = now(); }, { toast: `“${s.text}” is now a subtask` });
      renderDrawer();
    }
    return;
  }
  const kid = b.closest('[data-cid]');
  if (kid) {
    const c = TASK[kid.dataset.cid]; if (!c) return;
    if (b.dataset.st === 'open') return openEditor(c.id);
    if (b.dataset.st === 'out') { unnestTasks([c.id]); return renderDrawer(); }
    if (b.dataset.st === 'tosub') { toSubnote(c); return renderDrawer(); }
    if (b.dataset.st === 'del') { deleteTasks([c]); return renderDrawer(); }
    return;
  }
  if (b.dataset.color !== undefined) return edit(t => { t.color = b.dataset.color; }, { drawer: true });
  const att = b.closest('[data-aid]');
  if (att) {
    const a = t.attachments.find(x => x.id === att.dataset.aid); if (!a) return;
    if (b.dataset.att === 'del') edit(t => { t.attachments = t.attachments.filter(x => x.id !== a.id); }, { drawer: true });
    if (b.dataset.att === 'open') openFileAttachment(a);
    return;
  }
  switch (b.dataset.ed) {
    case 'close': return closeDrawer();
    case 'done': { let msg; mutate(isDone(t) ? 'Reopen' : 'Mark done', () => { msg = setStatus(t, isDone(t) ? defaultStatus() : doneStatus()); t.updated = now(); }); renderDrawer(); toast(msg || (isDone(t) ? 'Marked done' : 'Reopened'), { undo: true }); return; }
    case 'dup': { let c; mutate('Duplicate task', () => { const cs = dupDeep(t); D.tasks.push(...cs); c = cs[0]; }); openEditor(c.id); toast('Duplicated — you are now editing the copy', { undo: true }); return; }
    case 'openparent': { const p = parentOf(t); if (p) openEditor(p.id); return; }
    case 'copy': { await copyText(tasksAsText([t])); toast('Copied as text'); return; }
    case 'delete': { closeDrawer(true); deleteTasks([t]); return; }
    case 'resetseen': return edit(t => { t.seen = 1; }, { drawer: true });
    case 'addlink': {
      const r = await askFields('Add a link', [{ key: 'url', label: 'URL', placeholder: 'https://…', type: 'url' }, { key: 'name', label: 'Label (optional)', placeholder: 'e.g. Contract draft' }]);
      if (r && r.url.trim()) edit(t => { t.attachments.push({ id: uid('at'), kind: 'link', url: r.url.trim(), name: r.name.trim() }); }, { drawer: true });
      return;
    }
  }
}
function onDrawerKey(e) {
  if (e.target.id === 'ed-subadd' && e.key === 'Enter') {
    e.preventDefault(); const v = e.target.value.trim(); if (!v) return;
    const lines = v.split(/\s*;\s*/).filter(Boolean);
    edit(t => { lines.forEach(l => { const b = stripBullet(l); t.subnotes.push({ id: uid('s'), text: b.text, done: b.done, note: '' }); }); }, { drawer: true });
    $('#ed-subadd')?.focus();
  }
  if (e.target.id === 'ed-subtaskadd' && e.key === 'Enter') {
    e.preventDefault(); const v = e.target.value.trim(); if (!v) return;
    const c = addSubtaskFromText(TASK[editingId], v); if (c) { renderDrawer(); $('#ed-subtaskadd')?.focus(); }
  }
  if (e.target.id === 'ed-title' && e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
}
async function addFiles(files) {
  const added = [];
  for (const f of files) {
    if (f.size > 50 * 1048576) { toast(`“${f.name}” is over 50 MB — add it as a link instead.`); continue; }
    const fileId = uid('f');
    try { await FileStore.put(fileId, { name: f.name, type: f.type, size: f.size, blob: f }); added.push({ id: uid('at'), kind: 'file', name: f.name, type: f.type, size: f.size, fileId }); }
    catch (err) { toast('This browser blocked file storage (private mode?). Add a link instead.'); break; }
  }
  if (added.length) edit(t => { t.attachments.push(...added); }, { drawer: true });
}
async function openFileAttachment(a) {
  const viewable = /^(image\/|application\/pdf|text\/|video\/|audio\/)/.test(a.type || '');
  const w = viewable ? window.open('', '_blank') : null;
  try {
    const rec = await FileStore.get(a.fileId);
    if (!rec || !rec.blob) { if (w) w.close(); toast('That file is not stored in this browser (it may have been added on another device).'); return; }
    const url = URL.createObjectURL(rec.blob);
    if (w) w.location.href = url;
    else { const l = document.createElement('a'); l.href = url; l.download = a.name || 'attachment'; document.body.appendChild(l); l.click(); l.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) { if (w) w.close(); toast('Could not open the file from browser storage.'); }
}

/* ---------- modals ---------- */
function openModal({ title, body, foot = '', wide = false, onClose, cls = '', autofocus = true, help = '' }) {
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal${wide ? ' wide' : ''} ${cls}" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h3>${esc(title)}</h3>${help ? `<button class="help-link" data-guide="${esc(help)}">How this works</button>` : ''}<button class="icon-btn" data-close aria-label="Close">✕</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  $('#modal-root').appendChild(back);
  let downOnBack = false;
  back.addEventListener('mousedown', e => { downOnBack = e.target === back; });
  back.addEventListener('click', e => { if ((e.target === back && downOnBack) || e.target.closest('[data-close]')) close(); downOnBack = false; });
  function close() { if (!back.isConnected) return; back.remove(); onClose && onClose(); }
  back.close = close;
  if (!autofocus) setTimeout(() => back.querySelector('.modal').focus(), 20);
  else setTimeout(() => { const f = back.querySelector('[autofocus], .modal-body input:not([type=checkbox]):not([type=file]), .modal-body textarea'); (f || back.querySelector('.modal-head .icon-btn'))?.focus(); }, 20);
  return back;
}
function askFields(title, fields, okLabel = 'Save') {
  return new Promise(res => {
    let done = false;
    const m = openModal({
      title, body: `<form class="ask" style="display:flex;flex-direction:column;gap:10px">${fields.map((f, i) => `<label class="field"><span>${esc(f.label)}</span><input class="inp" name="${esc(f.key)}" type="${f.type || 'text'}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder || '')}" ${i === 0 ? 'autofocus' : ''}></label>`).join('')}<button type="submit" hidden></button></form>`,
      foot: `<button class="btn" data-close>Cancel</button><button class="btn primary" data-ok>${esc(okLabel)}</button>`,
      onClose: () => { if (!done) res(null); },
    });
    const finish = () => { done = true; const out = {}; fields.forEach(f => out[f.key] = m.querySelector(`[name="${CSS.escape(f.key)}"]`).value); m.close(); res(out); };
    m.querySelector('form').addEventListener('submit', e => { e.preventDefault(); finish(); });
    m.querySelector('[data-ok]').addEventListener('click', finish);
  });
}
function confirmBox(title, message, okLabel = 'OK', danger = false) {
  return new Promise(res => {
    let done = false;
    const m = openModal({ title, body: `<p style="margin:0">${message}</p>`, foot: `<button class="btn" data-close>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok autofocus>${esc(okLabel)}</button>`, onClose: () => { if (!done) res(false); } });
    m.querySelector('[data-ok]').addEventListener('click', () => { done = true; m.close(); res(true); });
    setTimeout(() => m.querySelector('[data-ok]').focus(), 30);
  });
}

/* ---------- popover menus ---------- */
let openMenuEl = null;
function closeMenu() { if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; document.removeEventListener('mousedown', menuOutside, true); return true; } return false; }
function menuOutside(e) { if (openMenuEl && !openMenuEl.contains(e.target)) closeMenu(); }
function popMenu(anchor, items, { filter = false } = {}) {
  closeMenu();
  const m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');
  const showFilter = filter && items.length > 10;
  m.innerHTML = (showFilter ? '<input class="inp" placeholder="Type to filter…" aria-label="Filter">' : '') + '<div class="mi"></div>';
  const draw = q => {
    q = (q || '').toLowerCase();
    m.querySelector('.mi').innerHTML = items.map((it, i) => [it, i]).filter(([it]) => !q || (it.label && it.label.toLowerCase().includes(q))).map(([it, i]) =>
      it.sep ? (q ? '' : '<hr>') : it.hd ? (q ? '' : `<div class="hd">${esc(it.hd)}</div>`) : it.swatches ? `<div class="sw-row">${CARD_COLORS.map(([k, l]) => `<button class="swb${it.value != null && (it.value || '') === k ? ' on' : ''}" data-i="${i}" data-swv="${k}" title="${l}" aria-label="${l}" style="--sw:${k ? tintVar(k) : 'var(--surface)'}"></button>`).join('')}</div>`
        : `<button role="menuitem" data-i="${i}" style="padding-left:${10 + (q ? 0 : (it.indent || 0) * 14)}px">${it.color !== undefined ? `<span class="sw" style="--c:${it.color || 'transparent'};${it.color ? '' : 'border:1px dashed var(--line)'}"></span>` : ''}<span>${esc(it.label)}</span>${it.hint ? `<span class="muted sm" style="margin-left:auto">${esc(it.hint)}</span>` : ''}</button>`).join('');
  };
  draw('');
  document.body.appendChild(m); openMenuEl = m;
  const r = anchor.getBoundingClientRect(); const mw = m.offsetWidth, mh = m.offsetHeight;
  let x = Math.min(r.left, innerWidth - mw - 8), y = r.bottom + 4;
  if (y + mh > innerHeight - 8) y = Math.max(8, r.top - mh - 4);
  m.style.left = Math.max(8, x) + 'px'; m.style.top = y + 'px';
  m.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; const it = items[+b.dataset.i]; closeMenu(); it.onPick && (it.swatches ? it.onPick(b.dataset.swv) : it.onPick()); });
  m.addEventListener('keydown', e => {
    const bs = $$('button[data-i]', m); const i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (bs[i + 1] || bs[0])?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (bs[i - 1] || bs[bs.length - 1])?.focus(); }
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); bs[0]?.click(); }
  });
  const fi = m.querySelector('input'); if (fi) { fi.addEventListener('input', () => draw(fi.value)); fi.focus(); } else m.querySelector('button')?.focus();
  setTimeout(() => document.addEventListener('mousedown', menuOutside, true), 0);
}

/* ---------- toasts ---------- */
function toast(msg, { undo: withUndo = false, ms = 5200 } = {}) {
  const box = $('#toasts'); if (!box) return;
  const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${withUndo ? '<button type="button">Undo</button>' : ''}`;
  if (withUndo) el.querySelector('button').addEventListener('click', () => { undo(); el.remove(); });
  box.appendChild(el);
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => el.remove(), withUndo ? ms + 2500 : ms);
}
