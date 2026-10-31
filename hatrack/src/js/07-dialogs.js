/* ============ HatRack — import, export, triage and help dialogs ============ */

const CHEAT = `<b>@Group</b> or <code>@Parent/Entity</code> — where it goes · <b>#Type</b> (unknown words become tags) · <b>!high</b> or <code>!1</code> — priority ·
  <b>~30m</b> <code>~1h30m</code> — time · <b>^fri</b> <code>^tomorrow</code> <code>^11/14</code> <code>^+3d</code> — due · <b>*weekly</b> <code>*monthly</code> <code>*weekdays</code> — repeats.<br>
  “Remind me to…” becomes a Reminder. <code>Idea:</code> / <code>Follow-up:</code> prefixes set the type. Lines ending in “:” or <code># headings</code> are groups; indented lines become subnotes; <code>[x]</code> marks done.`;

/* ---------- import ---------- */
function openImport(prefill = '', presetKeys = []) {
  const o = { ...defaultImportOpts(), ...(U.importOpts || {}), base: cur() };
  let keys = presetKeys.filter(Boolean);
  const excluded = new Set(); let res = null;
  const areaOpts = opt('', 'Unsorted', o.base || '') + areaTreeFlat().map(({ a, d }) => opt(a.id, ' '.repeat(d) + a.name, o.base)).join('');
  const m = openModal({
    title: 'Import notes', wide: true, help: 'import',
    body: `<div class="imp">
      <div><textarea id="imp-text" class="inp imp-text" spellcheck="false" placeholder="Paste a long list here — from Notes, email, a doc, a spreadsheet…

Northside Coffee:
- Reorder oat milk *weekly ^mon !high
- Fix the grinder ~1h
    - order new burrs
Remind me to call the accountant ^fri
Idea: holiday gift boxes for wholesale">${esc(prefill)}</textarea>
        <div class="imp-filebar"><label class="btn sm" style="cursor:pointer">Open a file…<input type="file" id="imp-file" accept=".txt,.md,.markdown,.csv,.tsv,text/plain,text/csv,text/markdown" multiple hidden></label><span class="muted">or drop .txt, .md or .csv files on this box</span></div></div>
      <div class="imp-opts">
        ${keys.length ? `<div class="target-chip" id="imp-target">Everything goes to <b>${esc(keys.map(keyLabel).filter(Boolean).join(' · '))}</b><button class="icon-btn sm" id="imp-untarget" aria-label="Don’t force a destination">✕</button></div>` : ''}
        <label class="field"><span>How is it laid out?</span><select class="inp" id="imp-mode">${[['auto', 'Work it out for me'], ['lines', 'One task per line'], ['blocks', 'Blocks split by blank lines (first line = title)'], ['sheet', 'Spreadsheet rows with a header row']].map(x => opt(x[0], x[1], o.mode)).join('')}</select></label>
        <label class="field"><span>A plain line with items under it is…</span><select class="inp" id="imp-group">${[['smart', 'Smart — a group if it’s a known name, ends in “:” or is in CAPS'], ['groups', 'Always a group (parent or entity)'], ['strict', 'A task — lines under it become subnotes']].map(x => opt(x[0], x[1], o.group)).join('')}</select></label>
        <label class="field"><span>Start from (headings and keywords sort within it)</span><select class="inp" id="imp-base">${areaOpts}</select></label>
        <div class="grid2">
          <label class="field"><span>Default type</span><select class="inp" id="imp-type">${opt('', 'Detect', o.defaultType)}${D.types.map(x => opt(x.id, `${x.icon ? x.icon + ' ' : ''}${x.name}`, o.defaultType)).join('')}</select></label>
          <label class="field"><span>Source label</span><input class="inp" id="imp-src" placeholder="e.g. Apple Notes" value="${esc(o.source || '')}" list="imp-src-list"></label>
        </div>
        <datalist id="imp-src-list">${['Apple Notes', 'Email', 'Voice memo', 'Notebook', 'Slack', 'Meeting notes', ...new Set(D.tasks.map(t => t.source).filter(Boolean))].slice(0, 30).map(s => `<option value="${esc(s)}">`).join('')}</datalist>
        <label class="field"><span>Indented lines under a task become</span><select class="inp" id="imp-nest">${[['subnotes', 'Subnotes — a checklist inside the task'], ['subtasks', 'Subtasks — full tasks you can date and sort']].map(x => opt(x[0], x[1], o.nest)).join('')}</select></label>
        <label class="field"><span>When the same note shows up more than once</span><select class="inp" id="imp-dup">${[['merge', 'Merge into one card and count it'], ['keep', 'Keep every copy'], ['skip', 'Skip the repeats']].map(x => opt(x[0], x[1], o.dup)).join('')}</select></label>
        <div class="imp-checks">
          <label class="chk"><input type="checkbox" id="imp-tokens" ${o.tokens ? 'checked' : ''}> Read shortcuts (@ # ! ~ ^ *)</label>
          <label class="chk"><input type="checkbox" id="imp-kw" ${o.keywords ? 'checked' : ''}> Auto-sort using group names and keywords</label>
          <label class="chk"><input type="checkbox" id="imp-create" ${o.create ? 'checked' : ''}> Create new groups from headings</label>
        </div>
        <details class="cheat"><summary>Shortcut cheat sheet</summary><div style="margin-top:6px">${CHEAT}</div></details>
      </div></div>
      <div class="imp-sum" id="imp-sum"></div>
      <div class="tbl-wrap" id="imp-prev" style="max-height:38vh;border:1px solid var(--line2);border-radius:10px"></div>`,
    foot: `<span class="left muted sm">Nothing is saved until you import. Undo works afterwards too.</span><button class="btn" data-close>Cancel</button><button class="btn primary" id="imp-go" disabled>Import</button>`,
  });
  const q = s => m.querySelector(s);
  const ta = q('#imp-text');
  function readOpts() {
    o.mode = q('#imp-mode').value; o.group = q('#imp-group').value; o.base = q('#imp-base').value || null;
    o.defaultType = q('#imp-type').value; o.source = q('#imp-src').value.trim(); o.dup = q('#imp-dup').value;
    o.tokens = q('#imp-tokens').checked; o.keywords = q('#imp-kw').checked; o.create = q('#imp-create').checked; o.nest = q('#imp-nest').value;
    U.importOpts = { mode: o.mode, group: o.group, dup: o.dup, tokens: o.tokens, keywords: o.keywords, create: o.create, defaultType: o.defaultType, nest: o.nest }; saveUI();
  }
  const exKey = (it, i) => dupKey(it.title) || '#' + i;
  function effArea(it) {
    let id = it.areaId;
    for (const k of keys) { const f = k.slice(0, k.indexOf('|')), v = k.slice(k.indexOf('|') + 1); if (f === 'area') { if (!v) id = null; else if (!res.ctx.inSub(id, v)) id = v; } if (f === 'areaself') id = v; }
    return id;
  }
  function update() {
    readOpts();
    res = parseImport(ta.value, o);
    res.items.forEach((it, i) => { it.exclude = excluded.has(exKey(it, i)); });
    draw();
  }
  function draw() {
    const items = res.items; const inc = items.filter(i => !i.exclude);
    const dups = inc.filter(i => i.dupOf || i.dupIdx != null).length;
    const sorted = inc.filter(i => effArea(i)).length;
    const newAreas = res.ctx.pending;
    const modeName = { lines: 'one task per line', blocks: 'blocks split by blank lines', sheet: 'spreadsheet rows' }[res.mode];
    const willCreate = o.dup === 'keep' ? inc.length : inc.length - dups;
    q('#imp-sum').innerHTML = items.length ? `<span><b>${willCreate}</b> new ${willCreate === 1 ? 'task' : 'tasks'}</span><span><b>${sorted}</b> already placed</span>${dups ? `<span><b>${dups}</b> repeats — ${o.dup === 'merge' ? 'merged and counted' : o.dup === 'skip' ? 'skipped' : 'kept'}</span>` : ''}${newAreas.length ? `<span><b>${newAreas.length}</b> new ${newAreas.length === 1 ? 'group' : 'groups'}: ${esc(newAreas.map(a => res.ctx.path(a.id)).join(', '))}</span>` : ''}<span class="muted">Read as ${modeName}</span>` : '<span class="muted">Paste or type something to see a preview.</span>';
    const go = q('#imp-go'); go.disabled = !inc.length; go.textContent = inc.length ? `Import ${plural(inc.length, 'line')}` : 'Import';
    if (!items.length) { q('#imp-prev').innerHTML = ''; return; }
    const shown = items.slice(0, 400);
    q('#imp-prev').innerHTML = `<table class="tbl"><thead><tr><th><input type="checkbox" id="imp-all" ${inc.length === items.length ? 'checked' : ''} aria-label="Include all"></th><th>Task</th><th>Goes to</th><th>Type</th><th>Priority</th><th>Due</th><th>Time</th><th>Repeats</th><th></th></tr></thead><tbody>${shown.map((it, i) => {
      const aid = effArea(it); const isNewArea = aid && res.ctx.ancestors(aid).some(a => res.ctx.isNew(a.id));
      return `<tr data-i="${i}" class="${it.exclude ? 'excluded' : ''}"><td><input type="checkbox" data-inc ${it.exclude ? '' : 'checked'} aria-label="Include"></td>
        <td class="t-title">${it.done ? '<s>' : ''}${esc(it.title)}${it.done ? '</s>' : ''}${it.subnotes.length ? `<span class="badge">+${plural(it.subnotes.length, o.nest === 'subtasks' ? 'subtask' : 'subnote')}</span>` : ''}${it.notes ? ' <span class="muted" title="Has notes">✎</span>' : ''}${it.tags.map(g => ` <span class="muted">#${esc(g)}</span>`).join('')}</td>
        <td>${aid ? esc(res.ctx.path(aid)) : '<span class="muted">Unsorted</span>'}${isNewArea ? '<span class="badge">new</span>' : ''}${it.autoSorted ? '<span class="badge" title="Matched a group name or keyword">auto</span>' : ''}</td>
        <td>${T[it.typeId] ? esc((T[it.typeId].icon ? T[it.typeId].icon + ' ' : '') + T[it.typeId].name) : ''}</td>
        <td>${PR[it.priorityId] ? esc(PR[it.priorityId].name) : ''}</td>
        <td>${it.due ? esc(fmtDate(it.due)) : ''}</td><td>${fmtDur(it.duration)}</td><td>${it.repeat ? esc(SHORT_REPEAT[it.repeat]) : ''}</td>
        <td>${it.dupOf ? `<span class="badge warn" title="${esc(TASK[it.dupOf]?.title || '')}">already on the rack</span>` : it.dupIdx != null ? `<span class="badge warn">repeat of row ${it.dupIdx + 1}</span>` : ''}</td></tr>`;
    }).join('')}</tbody></table>${items.length > shown.length ? `<p class="muted sm" style="padding:6px 10px">…and ${items.length - shown.length} more</p>` : ''}`;
  }
  let timer; const later = () => { clearTimeout(timer); timer = setTimeout(update, 220); };
  ta.addEventListener('input', later);
  m.querySelector('.imp-opts').addEventListener('change', update);
  q('#imp-src').addEventListener('input', later);
  q('#imp-prev').addEventListener('change', e => {
    if (e.target.id === 'imp-all') { res.items.forEach((it, i) => { if (e.target.checked) excluded.delete(exKey(it, i)); else excluded.add(exKey(it, i)); it.exclude = !e.target.checked; }); draw(); return; }
    const tr = e.target.closest('tr[data-i]'); if (!tr) return; const i = +tr.dataset.i; const it = res.items[i];
    if (e.target.checked) excluded.delete(exKey(it, i)); else excluded.add(exKey(it, i));
    update();
  });
  m.addEventListener('click', e => { if (e.target.closest('#imp-untarget')) { keys = []; q('#imp-target')?.remove(); update(); } });
  q('#imp-file').addEventListener('change', async e => { const text = await readTextFiles(Array.from(e.target.files || [])); if (text) { ta.value = (ta.value.trim() ? ta.value + '\n\n' : '') + text; update(); } e.target.value = ''; });
  ta.addEventListener('dragover', e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); ta.classList.add('drop-hint'); } });
  ta.addEventListener('dragleave', () => ta.classList.remove('drop-hint'));
  ta.addEventListener('drop', async e => { if (!e.dataTransfer?.files?.length) return; e.preventDefault(); ta.classList.remove('drop-hint'); const text = await readTextFiles(Array.from(e.dataTransfer.files)); if (text) { ta.value = (ta.value.trim() ? ta.value + '\n\n' : '') + text; update(); } });
  q('#imp-go').addEventListener('click', () => {
    if (!res) update(); let out;
    mutate('Import notes', () => { out = commitParsed(res, o, keys); });
    m.close();
    const bits = [`Imported ${plural(out.created.length, 'task')}`]; if (out.kids) bits.push(`${plural(out.kids, 'subtask')}`); if (out.merged) bits.push(`merged ${out.merged} ${out.merged === 1 ? 'repeat' : 'repeats'}`); if (out.skipped) bits.push(`skipped ${out.skipped}`);
    toast(bits.join(', '), { undo: true });
  });
  if (prefill) update(); else draw0();
  function draw0() { res = { items: [], ctx: new AreaCtx(false), mode: 'lines' }; draw(); }
  setTimeout(() => ta.focus(), 30);
}

/* ---------- export ---------- */
const EXPORT_HELP = {
  csv: 'Opens in Excel or Google Sheets. Notion, Airtable, ClickUp and Monday import it with their CSV importers — map Title, Notes, Due and the group columns. For Trello, use an import power-up, or copy a column as a plain list and paste it into a Trello list.',
  todoist: 'In Todoist: open (or create) a project → ⋯ → Import from CSV. Sections become Todoist sections; priorities map onto p1–p4; repeats use Todoist’s “every …” wording. Todoist takes up to 300 tasks per project, so turn on “One file per section” to make one project per group.',
  asana: 'In Asana: open a project → Add tasks via → CSV, tick “Use first row as column names”, then map Section and Due Date. Priority, type and time import as custom fields on paid plans and land in the description otherwise.',
  md: 'Paste into Notion, Obsidian, Bear or a GitHub issue — checkboxes stay checkable.',
  txt: 'Each line becomes one task. Paste into a Trello list, Apple Reminders, Things, TickTick or Microsoft To Do.',
  ics: 'Import into Google Calendar (Settings → Import & export), Outlook or Apple Calendar. Each dated task becomes an all-day event; repeating reminders keep their schedule and get a 9 am alert.',
  json: 'A HatRack file with your setup. Load it on another computer with Configure → Data → Restore.',
};
function openExport(preset = {}) {
  const st = { fmt: U.exportFmt || 'csv', scope: preset.ids ? 'ids' : preset.scope === 'selected' && sel.size ? 'selected' : (sel.size ? 'selected' : 'view'), done: false, sections: U.exportSections || 'l1', split: false, board: true, typeLabel: true, bom: true, tokens: false };
  const scopes = () => {
    const all = D.tasks.length, view = visibleTasks().length;
    const o = [['view', `On screen now — ${cur() ? pathStr(cur()) : 'whole rack'}${filtersActive() ? ', filtered' : ''} (${view})`], ['all', `Everything (${all})`]];
    if (sel.size) o.unshift(['selected', `Selected (${sel.size})`]);
    if (preset.ids) o.unshift(['ids', `${preset.label} (${preset.ids.length})`]);
    return o;
  };
  const m = openModal({
    title: 'Export', wide: true, help: 'export',
    body: `<div class="fmt-grid" id="ex-fmts">${EXPORT_FORMATS.map(f => `<label class="fmt${f.id === st.fmt ? ' on' : ''}"><input type="radio" name="ex-fmt" value="${f.id}" ${f.id === st.fmt ? 'checked' : ''}><b>${esc(f.name)}</b><span>${esc(f.desc)}</span></label>`).join('')}</div>
      <div class="exp-row">
        <label class="field"><span>Which tasks</span><select class="inp" id="ex-scope">${scopes().map(s => opt(s[0], s[1], st.scope)).join('')}</select></label>
        <label class="field"><span>Sections</span><select class="inp" id="ex-sec">${sectionOptions().map(s => opt(s[0], s[1], st.sections)).join('')}</select></label>
        <label class="chk"><input type="checkbox" id="ex-done"> Include done tasks</label>
        <span id="ex-opts" style="display:flex;gap:12px;flex-wrap:wrap"></span>
      </div>
      <p class="note-line" id="ex-help"></p>
      <div id="ex-notes"></div>
      <p class="muted sm" id="ex-file" style="margin:10px 0 4px"></p>
      <pre class="exp-pre" id="ex-pre"></pre>`,
    foot: `<span class="left muted sm" id="ex-count"></span><button class="btn" id="ex-copy">Copy</button><button class="btn primary" id="ex-dl">Download</button>`,
  });
  const q = s => m.querySelector(s);
  let built = null;
  function list() {
    let l = st.scope === 'all' ? D.tasks.slice() : st.scope === 'selected' ? selTasks() : st.scope === 'ids' ? preset.ids.map(i => TASK[i]).filter(Boolean) : visibleTasks();
    if (!st.done) l = l.filter(t => !isDone(t));
    return l;
  }
  function optsHTML() {
    const c = (id, label, on, title = '') => `<label class="chk" title="${esc(title)}"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}> ${label}</label>`;
    const f = st.fmt; let h = '';
    if (['csv', 'todoist', 'asana', 'md', 'txt'].includes(f)) h += c('ex-split', 'One file per section', st.split, 'Makes a separate file for each section — handy for one project per business.');
    if (f === 'todoist') h += c('ex-board', 'Open as a board', st.board) + c('ex-tl', 'Add the type as a label', st.typeLabel);
    if (f === 'csv') h += c('ex-bom', 'Excel-friendly encoding', st.bom, 'Adds a marker so Excel shows emoji and accents correctly.');
    if (f === 'txt') h += c('ex-tok', 'Keep HatRack shortcuts', st.tokens, 'Adds @group #type !priority ^due so the list can be re-imported.');
    q('#ex-opts').innerHTML = h;
  }
  function update() {
    const l = list();
    built = buildExport(st.fmt, l, { sections: st.sections, split: st.split, board: st.board, typeLabel: st.typeLabel, bom: st.bom, tokens: st.tokens, title: cur() ? `${pathStr(cur())} — tasks` : 'HatRack tasks' });
    q('#ex-help').textContent = EXPORT_HELP[st.fmt];
    q('#ex-notes').innerHTML = built.notes.map(n => `<p class="note-line" style="color:var(--danger)">${esc(n)}</p>`).join('');
    const f0 = built.files[0];
    q('#ex-file').textContent = built.files.length > 1 ? `${built.files.length} files — previewing ${f0.name}` : f0 ? f0.name : '';
    const lines = (f0?.text || '').replace(/^﻿/, '').split(/\r?\n/);
    q('#ex-pre').textContent = lines.slice(0, 60).join('\n') + (lines.length > 60 ? `\n… ${lines.length - 60} more lines` : '');
    q('#ex-count').textContent = plural(l.length, 'task');
    q('#ex-dl').textContent = built.files.length > 1 ? `Download ${built.files.length} files` : 'Download';
    q('#ex-dl').disabled = q('#ex-copy').disabled = !l.length;
  }
  m.addEventListener('change', e => {
    const el = e.target;
    if (el.name === 'ex-fmt') { st.fmt = el.value; U.exportFmt = st.fmt; saveUI(); $$('.fmt', m).forEach(x => x.classList.toggle('on', x.querySelector('input').checked)); optsHTML(); }
    if (el.id === 'ex-scope') st.scope = el.value;
    if (el.id === 'ex-sec') { st.sections = el.value; U.exportSections = st.sections; saveUI(); }
    if (el.id === 'ex-done') st.done = el.checked;
    if (el.id === 'ex-split') st.split = el.checked;
    if (el.id === 'ex-board') st.board = el.checked;
    if (el.id === 'ex-tl') st.typeLabel = el.checked;
    if (el.id === 'ex-bom') st.bom = el.checked;
    if (el.id === 'ex-tok') st.tokens = el.checked;
    update();
  });
  q('#ex-dl').addEventListener('click', () => {
    built.files.forEach((f, i) => setTimeout(() => downloadText(f.name, f.text, f.mime), i * 350));
    toast(built.files.length > 1 ? `Downloading ${built.files.length} files` : `Downloaded ${built.files[0].name}`);
  });
  q('#ex-copy').addEventListener('click', async () => {
    const text = built.files.map(f => f.text.replace(/^﻿/, '')).join(st.fmt === 'md' || st.fmt === 'txt' ? '\n\n' : '');
    await copyText(built.files.length > 1 && !['md', 'txt'].includes(st.fmt) ? built.files[0].text.replace(/^﻿/, '') : text);
    toast('Copied to the clipboard');
  });
  optsHTML(); update();
}

/* ---------- triage ---------- */
let triageOn = false;
function openTriage() {
  const root = cur();
  const queue = sortTasks(D.tasks.filter(t => !isDone(t) && isRootTask(t) && (root ? t.areaId === root : !(t.areaId && A[t.areaId]))), 'manual').map(t => t.id);
  if (!queue.length) { toast(root ? `Everything in ${A[root].name} is already sorted further.` : 'Nothing is unsorted right now.'); return; }
  if (!D.areas.length) { toast('Add your groups first — Configure → Groups & levels, or “+ Add” on the board.'); }
  snapshot('Triage session');
  let i = 0, level = root; const sortedIds = new Set();
  triageOn = true;
  const m = openModal({
    title: root ? `Triage — ${A[root].name}` : 'Triage unsorted tasks', body: '<div class="triage" id="tri"></div>', cls: 'tri-modal', autofocus: false, help: 'triage',
    onClose: () => {
      triageOn = false; document.removeEventListener('keydown', onKey, true); reindex(); save(); renderAll();
      if (sortedIds.size) toast(`Triage: sorted ${plural(sortedIds.size, 'task')}`, { undo: true });
    },
  });
  const box = m.querySelector('#tri');
  const task = () => TASK[queue[i]];
  const touch = t => { t.updated = now(); save(); };
  function render() {
    while (i < queue.length && !TASK[queue[i]]) i++;
    if (i >= queue.length) {
      box.innerHTML = `<div class="tri-done"><h3>All hung up</h3><p class="muted">You sorted ${plural(sortedIds.size, 'task')}${queue.length - sortedIds.size > 0 ? ` and left ${queue.length - sortedIds.size} where ${queue.length - sortedIds.size === 1 ? 'it was' : 'they were'}` : ''}.</p><div class="set-actions" style="justify-content:center"><button class="btn primary" data-close>Back to the board</button></div></div>`;
      return;
    }
    const t = task(); const options = kids(level); const lvlName = levelName(depthOf(level) + 1);
    const chips = (items, attr, curv) => items.map(x => `<button class="opt" data-${attr}="${x.id}" aria-pressed="${x.id === curv}" style="--c:${x.color || 'var(--muted)'}"><span class="sw"></span>${x.icon ? esc(x.icon) + ' ' : ''}${esc(x.name)}</button>`).join('');
    const upPath = ancestors(level).filter(a => !root || inSubtree(a.id, root));
    box.innerHTML = `
      <div class="tri-progress" aria-hidden="true"><div style="width:${(i / queue.length) * 100}%"></div></div>
      <div class="muted sm">${i + 1} of ${queue.length} · ${sortedIds.size} sorted so far</div>
      <div class="tri-card" style="--tag:${areaColor(t.areaId) || 'var(--line)'}">
        <textarea class="tri-title" id="tri-title" rows="1" aria-label="Title">${esc(t.title)}</textarea>
        ${t.notes ? `<div class="tri-notes">${esc(t.notes)}</div>` : ''}
        ${t.subnotes.length ? `<div class="tri-notes">${t.subnotes.map(s => `${s.done ? '☑' : '☐'} ${esc(s.text)}`).join('\n')}</div>` : ''}
        ${childrenOf(t.id).length ? `<div class="tri-notes">${taskDescendants(t).map(c => `${'  '.repeat(taskDepth(c) - 1)}↳ ${esc(c.title)}`).join('\n')}</div>` : ''}
        ${t.source || (t.seen || 1) > 1 ? `<div class="muted sm" style="margin-top:8px">${t.source ? 'From ' + esc(t.source) : ''}${(t.seen || 1) > 1 ? ` · noted ×${t.seen}` : ''}</div>` : ''}
      </div>
      <div class="tri-row"><div class="lbl">${upPath.length && level !== root ? `<button class="btn ghost sm" data-tri="up">‹ ${esc(upPath.map(a => a.name).join(' / '))}</button><kbd>⌫</kbd> · ` : ''}${options.length ? `Pick ${esc(aAn(lvlName.toLowerCase()))} — press its number${level !== root ? ', or Enter to keep it here' : ''}` : (level === root ? `No ${esc(lvlName.toLowerCase())} yet — add one` : 'No deeper groups here. Press Enter for the next task.')}</div>
        <div class="tri-opts">${options.map((a, j) => `<button class="opt big" data-area="${a.id}" style="--c:${areaColor(a.id) || 'var(--muted)'}" aria-pressed="${inSubtree(t.areaId, a.id)}"><span class="sw"></span>${esc(a.name)}${kids(a.id).length ? ' ›' : ''}${j < 9 ? `<span class="k">${j + 1}</span>` : ''}</button>`).join('')}<button class="opt" data-newarea>+ New ${esc(lvlName.toLowerCase())}</button></div></div>
      <div class="tri-row"><div class="lbl">Type <kbd>T</kbd></div><div class="tri-opts">${chips(D.types, 'ty', t.typeId)}</div></div>
      <div class="tri-row"><div class="lbl">Priority <kbd>P</kbd></div><div class="tri-opts">${chips(D.priorities, 'pr', t.priorityId)}</div></div>
      <div class="tri-row"><div class="lbl">Time</div><div class="tri-opts">${durPresets().map(d => `<button class="opt" data-dur="${d}" aria-pressed="${+t.duration === d}">${fmtDur(d)}</button>`).join('')}</div></div>
      <div class="tri-row"><div class="lbl">Due</div><div class="tri-opts">${[['today', 'Today'], ['tomorrow', 'Tomorrow'], ['week', 'This week'], ['next', 'Next week'], ['none', 'No date']].map(([k, l]) => { const v = k === 'tomorrow' ? addDays(todayStr(), 1) : dueForBucket(k); return `<button class="opt" data-due="${v || ''}" aria-pressed="${(t.due || '') === (v || '')}">${l}</button>`; }).join('')}<input class="inp" type="date" id="tri-date" value="${esc(t.due || '')}" aria-label="Pick a date"></div></div>
      <div class="set-actions" style="align-items:center">
        <button class="btn" data-tri="prev" ${i === 0 ? 'disabled' : ''}>← Back</button><button class="btn" data-tri="skip">Skip <kbd>S</kbd></button>
        <button class="btn" data-tri="done">Mark done <kbd>D</kbd></button><button class="btn danger" data-tri="delete">Delete</button>
        <span class="spacer"></span><label class="chk sm"><input type="checkbox" id="tri-auto" ${U.triageAuto ? 'checked' : ''}> Jump ahead after the last level</label>
        <button class="btn primary" data-tri="next">Next <kbd>Enter</kbd></button></div>`;
    autoGrow(box.querySelector('#tri-title'));
  }
  function next() { i++; level = root; render(); }
  function prev() { if (i > 0) { i--; level = root; render(); } }
  function up() { if (level === root) return; const p = A[level]?.parentId || null; level = root && !inSubtree(p, root) ? root : p; render(); }
  function pickArea(id) {
    const t = task(); setAreaDeep(t, id);
    touch(t); sortedIds.add(t.id);
    if (kids(id).length) { level = id; render(); } else if (U.triageAuto) next(); else { level = id; render(); }
  }
  function cycle(arr, key) { const t = task(); const ix = arr.findIndex(x => x.id === t[key]); t[key] = ix + 1 < arr.length ? arr[ix + 1].id : null; touch(t); render(); }
  function del() { const t = task(); const gone = new Set(withDescendants([t]).map(x => x.id)); D.tasks = D.tasks.filter(x => !gone.has(x.id)); reindex(); save(); render(); }
  function markDone() { const t = task(); const msg = setStatus(t, doneStatus()); touch(t); if (msg) toast(msg); next(); }
  box.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return; const t = task();
    if (b.dataset.area) return pickArea(b.dataset.area);
    if (b.hasAttribute('data-newarea')) { const id = await addAreaQuiet(level); if (id) pickArea(id); else render(); return; }
    if (b.dataset.ty) { t.typeId = t.typeId === b.dataset.ty ? null : b.dataset.ty; touch(t); return render(); }
    if (b.dataset.pr) { t.priorityId = t.priorityId === b.dataset.pr ? null : b.dataset.pr; touch(t); return render(); }
    if (b.dataset.dur) { t.duration = +t.duration === +b.dataset.dur ? null : +b.dataset.dur; touch(t); return render(); }
    if (b.dataset.due !== undefined) { t.due = b.dataset.due || null; touch(t); return render(); }
    const a = b.dataset.tri;
    if (a === 'next' || a === 'skip') next(); else if (a === 'prev') prev(); else if (a === 'up') up(); else if (a === 'done') markDone(); else if (a === 'delete') del();
  });
  box.addEventListener('input', e => { if (e.target.id === 'tri-title') { autoGrow(e.target); const t = task(); t.title = e.target.value.replace(/\n/g, ' ').trim() || 'Untitled'; touch(t); } });
  box.addEventListener('change', e => {
    if (e.target.id === 'tri-date') { const t = task(); t.due = e.target.value || null; touch(t); render(); }
    if (e.target.id === 'tri-auto') { U.triageAuto = e.target.checked; saveUI(); }
  });
  function onKey(e) {
    if (!m.isConnected || $('#modal-root').lastElementChild !== m) return;
    if (e.key === 'Escape' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) { if (e.key === 'Enter' && e.target.id === 'tri-title') { e.preventDefault(); e.target.blur(); } return; }
    if (i >= queue.length) return;
    const k = e.key, kl = k.toLowerCase(); let hit = true;
    if (/^[1-9]$/.test(k)) { const a = kids(level)[+k - 1]; if (a) pickArea(a.id); else hit = false; }
    else if (k === 'Enter' || k === 'ArrowRight' || kl === 's') next();
    else if (k === 'ArrowLeft') prev();
    else if (k === 'Backspace') up();
    else if (kl === 'd') markDone();
    else if (kl === 't') cycle(D.types, 'typeId');
    else if (kl === 'p') cycle(D.priorities, 'priorityId');
    else if (k === 'Delete') del();
    else hit = false;
    if (hit) { e.preventDefault(); e.stopPropagation(); }
  }
  document.addEventListener('keydown', onKey, true);
  render();
}
/** add an area without a separate undo step (used inside triage) */
async function addAreaQuiet(parentId) {
  const lvl = levelName(depthOf(parentId) + 1);
  const r = await askFields(`New ${lvl.toLowerCase()}`, [{ key: 'name', label: 'Name', placeholder: parentId ? `Inside ${A[parentId].name}` : 'A business, organization, project or “Personal”' }]);
  if (!r || !r.name.trim()) return null;
  const a = { id: uid('ar'), name: r.name.trim(), parentId: parentId || null, color: parentId ? '' : nextColor(), keywords: '', notes: '', order: kids(parentId).length };
  D.areas.push(a); reindex(); save(); return a.id;
}

/* ---------- help ---------- */
function openHelp() {
  openModal({
    title: 'Shortcuts & tips', wide: false, help: 'start',
    body: `<div class="help">
      <p class="note-line" style="margin:0 0 6px">Want pictures? <button class="linkish" data-guide="start">Open the visual guide</button> — every screen, menu and setting, annotated.</p>
      <h4>The idea</h4>
      <p style="margin:0">Every task hangs on a hat: a <b>${esc(levelName(1))}</b> (a business, organization or “Personal”), then optionally an <b>${esc(levelName(2))}</b> and a <b>${esc(levelName(3))}</b>. Paste your long lists in, sort them visually, then export each sector to the app you run your day in.</p>
      <h4>Sorting</h4>
      <div class="help-grid">
        <span>Drag a card</span><span>Moves it. The column sets that field — drop on “High” and it becomes high priority.</span>
        <span>Alt / Option + drag</span><span>Copies instead of moving (or set Options → “Dropping copies the card”).</span>
        <span>Click a column name</span><span>Opens that group so you can sort into its ${esc(pluralize(levelName(2).toLowerCase()))}.</span>
        <span>Columns / Rows</span><span>Group by type, priority, status, time, due date or your own fields — rows add a second dimension.</span>
        <span>Triage</span><span>One task at a time: press a number to hang it up. Fastest way through a long list.</span>
      </div>
      <h4>Keyboard</h4>
      <div class="help-grid">
        <kbd>N</kbd><span>Quick add</span><kbd>I</kbd><span>Import notes</span><kbd>T</kbd><span>Triage</span><kbd>E</kbd><span>Export</span>
        <span><kbd>Ctrl/⌘</kbd>-click, <kbd>Shift</kbd>-click</span><span>Select several cards</span>
        <span><kbd>1</kbd>–<kbd>9</kbd></span><span>Move selected cards to that column</span>
        <span><kbd>Ctrl/⌘ C</kbd> / <kbd>V</kbd></span><span>Copy cards; paste into the column under your mouse. Pasting text from anywhere imports it.</span>
        <span><kbd>Ctrl/⌘ D</kbd></span><span>Duplicate selected</span><span><kbd>Delete</kbd></span><span>Delete selected</span>
        <span><kbd>Ctrl/⌘ Z</kbd></span><span>Undo</span><span><kbd>Esc</kbd></span><span>Close / clear selection</span>
      </div>
      <h4>Shortcuts inside a task’s text</h4>
      <div class="help-grid">
        <code>@Northside</code><span>Put it in a group (also <code>@Parent/Entity</code> or <code>@"Two words"</code>)</span>
        <code>#Reminder</code><span>Set the type; other hashtags become tags</span>
        <code>!high</code> <code>!1</code><span>Priority by name or position</span>
        <code>~45m</code> <code>~2h</code><span>Estimated time</span>
        <code>^fri</code> <code>^11/14</code> <code>^+3d</code><span>Due date</span>
        <code>*weekly</code><span>Repeats: daily, weekdays, weekly, biweekly, monthly, quarterly, yearly</span>
      </div>
      <h4>Your data</h4>
      <p style="margin:0">Everything is saved in this browser on this device — no account, no server. Use Configure → Data to back up or move to another computer.</p>
    </div>`,
  });
}

/* ---------- visual guide (guide.html, shown inside the app) ---------- */
const GUIDE_URL = 'guide.html';
function openGuide(section = '') {
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const hash = section ? '#' + encodeURIComponent(section) : '';
  const src = `${GUIDE_URL}?embed=1&theme=${dark ? 'dark' : 'light'}${hash}`;
  const existing = $('.guide-modal iframe');
  if (existing) { existing.src = src; return; }
  const m = openModal({
    title: 'HatRack guide', cls: 'guide-modal', autofocus: false,
    body: `<iframe class="guide-frame" src="${src}" title="HatRack visual guide"></iframe>
      <div class="empty" id="guide-missing" hidden style="margin:20px auto"><h2>The guide isn’t next to the app yet</h2><p>Upload <code>guide.html</code> and the <code>guide</code> folder to the same place as <code>index.html</code> (they’re in the download). Until then, the quick reference covers the shortcuts.</p><div class="acts"><button class="btn primary" id="guide-tips">Open shortcuts & tips</button></div></div>`,
    foot: `<span class="left muted sm">Tip: every dialog has a “How this works” link that jumps to its section.</span><a class="btn" href="${GUIDE_URL}${hash}" target="_blank" rel="noopener">Open in a new tab</a><button class="btn primary" data-close>Done</button>`,
  });
  const missing = () => { const f = m.querySelector('iframe'); if (f) f.hidden = true; m.querySelector('#guide-missing').hidden = false; };
  m.querySelector('#guide-tips').addEventListener('click', () => { m.close(); openHelp(); });
  if (location.protocol.startsWith('http')) fetch(GUIDE_URL, { method: 'HEAD', cache: 'no-store' }).then(r => { if (!r.ok) missing(); }).catch(missing);
}
function helpMenu(anchor) {
  popMenu(anchor, [
    { label: 'Visual guide', hint: 'G', onPick: () => openGuide() },
    { label: 'Shortcuts & tips', hint: '?', onPick: () => openHelp() },
    { sep: true },
    { label: 'Guide: setting up (admins)', onPick: () => openGuide('admin') },
    { label: 'What’s new', onPick: () => openGuide('whats-new') },
  ]);
}
