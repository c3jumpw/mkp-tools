/* ============ HatRack — app shell, keyboard, sample data, start-up ============ */

function isTypingTarget(el) { return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); }
function anyLayerOpen() { return !!(openMenuEl || $('#modal-root').children.length); }
function closeTopLayer() {
  if (closeMenu()) return true;
  const ms = $('#modal-root').children; if (ms.length) { ms[ms.length - 1].close(); return true; }
  if (!$('#drawer').hidden) { closeDrawer(); return true; }
  return false;
}
function unsortedCount() { const c = cur(); return D.tasks.filter(t => !isDone(t) && isRootTask(t) && (c ? t.areaId === c : !(t.areaId && A[t.areaId]))).length; }

function renderHeader() {
  $$('#views button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === U.view)));
  $('#btn-settings').setAttribute('aria-pressed', String(U.view === 'settings'));
  const n = unsortedCount();
  $('#btn-triage').innerHTML = `Triage${n ? ` <span class="badge warn">${n}</span>` : ''}`;
  $('#btn-triage').title = n ? `Sort ${plural(n, 'unsorted task')} one at a time (T)` : 'Sort unsorted tasks one at a time (T)';
}
function renderView() {
  const v = U.view;
  if (v === 'list') renderList(); else if (v === 'outline') renderOutline(); else if (v === 'reports') renderReports(); else if (v === 'settings') renderSettings(); else renderBoard();
}
function renderAll() { renderHeader(); renderToolbar(); renderView(); renderSelBar(); if (editingId && !TASK[editingId]) closeDrawer(true); }
function setView(v) { U.view = v; saveUI(); closeMenu(); if (v === 'settings') closeDrawer(true); renderAll(); $('#view').scrollTo({ top: 0, left: 0 }); }

function applyTheme() {
  const r = document.documentElement;
  if (U.theme === 'light' || U.theme === 'dark') r.dataset.theme = U.theme; else delete r.dataset.theme;
  const b = $('#btn-theme'); if (b) b.title = `Theme: ${U.theme === 'auto' ? 'match my device' : U.theme} (click to change)`;
}

/* ---------- global keyboard ---------- */
function onGlobalKey(e) {
  if (e.key === 'Escape') { if (closeTopLayer()) { e.preventDefault(); return; } if (sel.size && !isTypingTarget(e.target)) { clearSel(); return; } if (isTypingTarget(e.target)) e.target.blur(); return; }
  if (triageOn || anyLayerOpen() || isTypingTarget(e.target)) return;
  const mod = e.metaKey || e.ctrlKey; const k = e.key.toLowerCase();
  if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
  if (mod && k === 'a' && (U.view === 'board' || U.view === 'list')) { e.preventDefault(); selectAllVisible(); return; }
  if (mod && k === 'd' && sel.size) { e.preventDefault(); duplicateSel(); return; }
  if (mod || e.altKey) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel.size) { e.preventDefault(); deleteSel(); return; }
  if (/^[1-9]$/.test(e.key) && sel.size && U.view === 'board') { e.preventDefault(); moveSelToCol(+e.key - 1); return; }
  if (e.target.closest?.('.card') && (e.key === 'Enter' || e.key === ' ')) return;
  if (k === 'n' || e.key === '/') { e.preventDefault(); $('#quick').focus(); return; }
  if (k === 'i') { e.preventDefault(); openImport(); return; }
  if (k === 't') { e.preventDefault(); openTriage(); return; }
  if (k === 'e') { e.preventDefault(); openExport(); return; }
  if (e.key === '?') { e.preventDefault(); openHelp(); return; }
  if (k === 'g') { e.preventDefault(); openGuide(); return; }
}

/* ---------- sample data ---------- */
function loadSample() {
  const td = todayStr(); const d = n => addDays(td, n);
  mutate('Add sample rack', () => {
    const mk = (name, parent, color, keywords = '', notes = '') => { const a = { id: uid('ar'), name, parentId: parent ? parent.id : null, color: color || '', keywords, notes, order: D.areas.filter(x => (x.parentId || null) === (parent ? parent.id : null)).length }; D.areas.push(a); return a; };
    const coffee = mk('Northside Coffee Co.', null, '#1E6B52', 'northside, coffee shop', 'Two cafés plus a small wholesale roasting line.');
    const cafe = mk('Café operations', coffee, '', 'espresso, grinder, menu, barista, oat milk, pastry');
    const whole = mk('Wholesale', coffee, '', 'wholesale, grocer, grocers, distributor, price sheet, pos');
    const hire = mk('Hiring & team', coffee, '', 'hire, hiring, interview, onboarding, shifts, schedule');
    const ledger = mk('Ledgerline Consulting', null, '#2F5D9E', 'ledgerline, consulting', 'Fractional CFO practice.');
    const harper = mk('Client: Harper Dental', ledger, '', 'harper');
    const vance = mk('Client: Vance Logistics', ledger, '', 'vance, sow');
    const admin = mk('Admin & billing', ledger, '', 'invoice, invoices, quickbooks, retainer, insurance, domain');
    const food = mk('Riverbend Food Bank board', null, '#8A3FA0', 'food bank, riverbend');
    const gala = mk('Fundraising gala', food, '', 'gala, sponsor, sponsors, auction, donor, catering');
    const board = mk('Board meetings', food, '', 'agenda, minutes, board meeting');
    const home = mk('Home & personal', null, '#B4532A', 'personal, home');
    const fam = mk('Family', home, '', 'mom, dad, kids, school');
    const health = mk('Health', home, '', 'dentist, doctor, gym, prescription');
    const house = mk('House', home, '', 'gutters, plumber, hvac, lawn, dry cleaning');
    reindex();
    const ty = n => D.types.find(x => x.name === n)?.id || null, pr = n => D.priorities.find(x => x.name === n)?.id || null;
    let ord = maxOrder();
    const add = (title, area, type, pri, dur, due, extra = {}) => { const t = newTask({ title, areaId: area ? area.id : null, typeId: ty(type), priorityId: pr(pri), duration: dur, due, order: ++ord, source: extra.source || 'Sample', ...extra }); D.tasks.push(t); return t; };
    const sub = (parent, title, type, pri, dur, due, extra = {}) => add(title, null, type, pri, dur, due, { parentId: parent.id, areaId: parent.areaId, ...extra });
    const sn = (text, done = false, note = '') => ({ id: uid('s'), text, done, note });
    add('Reorder oat milk for both cafés', cafe, 'Reminder', 'High', 15, nextWeekdayOnOrAfter(td, 1), { repeat: 'weekly' });
    add('Recalibrate the main grinder', cafe, 'Task', 'Medium', 60, null, { subnotes: [sn('Order replacement burrs', true), sn('Book a slow Tuesday morning')], notes: 'Shots running fast since last week — check burr wear before blaming the beans. The Mazzer manual says burrs last roughly 700–900 kg; we are past 800. Keep the old set as a backup for the second café.' });
    const price = add('Draft the 2027 wholesale price sheet', whole, 'Task', 'High', 120, d(5), { color: 'yellow', notes: 'Green coffee is up about 12% this year. Hold the café blend flat for the two biggest grocery accounts and raise single origins. Send a draft to Dana before it goes out.' });
    sub(price, 'Collect green coffee costs from the importer', 'Follow-up', 'High', 30, d(2));
    sub(price, 'Compare two competitor price lists', 'Task', 'Medium', 45, null);
    add('Follow up with Greenway Grocers’ buyer', whole, 'Follow-up', 'High', 15, d(1), { seen: 2 });
    add('Interview two weekend barista candidates', hire, 'Meeting', 'Medium', 60, d(3), { color: 'blue' });
    add('Seasonal cold brew flight', cafe, 'Idea', 'Someday', null, null, { color: 'green' });
    const deck = add('Q4 cash-flow review deck for Harper Dental', harper, 'Task', 'Urgent', 240, d(2), { color: 'yellow' });
    sub(deck, 'Pull September actuals', 'Task', 'High', 60, d(1));
    const hireModel = sub(deck, 'Model the second chair hire', 'Task', 'High', 120, d(2), { notes: 'Ask Dr. Harper for the start date.' });
    sub(hireModel, 'Get a payroll quote', 'Follow-up', 'Medium', 15, d(1));
    add('Send Vance Logistics the revised SOW', vance, 'Follow-up', 'High', 30, td);
    add('Send October invoices', admin, 'Reminder', 'High', 30, d(3), { repeat: 'monthly' });
    add('Renew professional liability insurance', admin, 'Task', 'Medium', 30, d(20));
    add('Confirm the gala venue deposit', gala, 'Task', 'Urgent', 15, d(-1), { color: 'red' });
    const sponsors = add('List ten local sponsor prospects', gala, 'Task', 'Medium', 60, null);
    sub(sponsors, 'Ask last year’s sponsors first', 'Follow-up', 'Medium', 30, d(4));
    add('Silent auction: “barista for a day” package', gala, 'Idea', 'Low', null, null);
    add('Review the November board agenda', board, 'Task', 'Medium', 30, d(6));
    add('School picture day form', fam, 'Reminder', 'High', 5, d(1));
    add('Dentist cleaning', health, 'Reminder', 'Medium', 60, d(14));
    add('Clean the gutters before the first freeze', house, 'Errand', 'Medium', 120, null);
    add('Call Mom', fam, 'Reminder', 'Medium', 30, nextWeekdayOnOrAfter(td, 0), { repeat: 'weekly', seen: 3, color: 'pink' });
    // unsorted — try Triage on these
    add('Renew the domain for the Ledgerline site', null, 'Reminder', null, null, null, { source: 'Voice memo' });
    add('Ask Priya about the catering quote for the gala', null, null, null, null, null, { source: 'Email' });
    add('Look into a POS that handles wholesale invoicing, gift cards and online ordering — compare Square, Toast and Clover pricing for both cafés before the holiday rush', null, null, null, null, null, { source: 'Apple Notes' });
    add('Book the HVAC tune-up', null, null, null, null, null, { source: 'Apple Notes' });
    add('Newsletter for consulting clients', null, 'Idea', null, null, null, { source: 'Notebook' });
    add('Pick up dry cleaning', null, null, null, null, null, { source: 'Notebook' });
    add('Schedule shifts for Thanksgiving week', null, null, null, null, null, { source: 'Slack' });
  });
  U.started = true; saveUI();
  toast('Sample rack added — try Triage on the unsorted cards, or drag them into a column', { undo: true });
}

/* ---------- start-up ---------- */
function init() {
  D = loadData(); U = loadUI(); normalizeData();
  const fieldOk = f => !f.startsWith('cf:') || D.fields.some(x => 'cf:' + x.id === f);
  if (!fieldOk(U.group)) U.group = 'area'; if (U.lanes !== 'none' && !fieldOk(U.lanes)) U.lanes = 'none';
  applyTheme();
  const view = $('#view');
  view.addEventListener('click', onViewClick);
  view.addEventListener('keydown', onViewKey);
  view.addEventListener('dragstart', onDragStart);
  view.addEventListener('dragstart', onOutlineDragStart);
  view.addEventListener('dragend', () => { drag = null; odrag = null; cleanupDrag(); olClear(); });
  view.addEventListener('dragover', onDragOver);
  view.addEventListener('dragover', onOutlineDragOver);
  view.addEventListener('dragleave', onDragLeave);
  view.addEventListener('drop', onDrop);
  view.addEventListener('drop', onOutlineDrop);
  view.addEventListener('change', onBoardChange);
  view.addEventListener('contextmenu', onContextMenu);
  view.addEventListener('mouseover', e => { const c = e.target.closest?.('.cell'); if (c) hoverCell = c; });
  ['change', 'click'].forEach(ev => { view.addEventListener(ev, onListEvent); view.addEventListener(ev, onOutlineEvent); });
  view.addEventListener('click', onReportEvent);
  view.addEventListener('focusin', onSettingsFocus);
  view.addEventListener('input', onSettingsInput);
  view.addEventListener('change', onSettingsChange);
  view.addEventListener('click', onSettingsClick);
  const tb = $('#toolbar');
  tb.addEventListener('input', onToolbarInput); tb.addEventListener('change', onToolbarInput); tb.addEventListener('click', onToolbarClick);
  $('#selbar').addEventListener('click', onSelBarClick);
  const dr = $('#drawer');
  dr.addEventListener('input', onDrawerInput); dr.addEventListener('change', onDrawerChange); dr.addEventListener('click', onDrawerClick); dr.addEventListener('keydown', onDrawerKey);
  $('#views').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
  $('#btn-import').addEventListener('click', () => openImport());
  $('#btn-triage').addEventListener('click', () => openTriage());
  $('#btn-export').addEventListener('click', () => openExport());
  $('#btn-settings').addEventListener('click', () => setView(U.view === 'settings' ? 'board' : 'settings'));
  $('#btn-help').addEventListener('click', e => helpMenu(e.currentTarget));
  document.addEventListener('click', e => { const g = e.target.closest?.('[data-guide]'); if (g) { e.preventDefault(); closeMenu(); openGuide(g.dataset.guide); } });
  $('#btn-theme').addEventListener('click', () => { U.theme = U.theme === 'auto' ? 'light' : U.theme === 'light' ? 'dark' : 'auto'; saveUI(); applyTheme(); toast(`Theme: ${U.theme === 'auto' ? 'matches your device' : U.theme}`); });
  $('#brand').addEventListener('click', e => { e.preventDefault(); U.cursor = null; setView('board'); });
  $('#quick-form').addEventListener('submit', e => {
    e.preventDefault(); const inp = $('#quick'); const v = inp.value.trim(); if (!v) return;
    const out = quickAddText(v, [], { base: cur() }); inp.value = '';
    const t = out?.created[0]; if (t) toast(`Added “${t.title}” to ${t.areaId ? pathStr(t.areaId) : 'Unsorted'}`, { undo: true });
  });
  document.addEventListener('keydown', onGlobalKey);
  document.addEventListener('copy', onCopy); document.addEventListener('cut', onCut); document.addEventListener('paste', onPaste);
  window.addEventListener('beforeunload', flushSave);
  window.addEventListener('storage', e => {
    if (e.key === LS_KEY && e.newValue) { try { D = migrate(JSON.parse(e.newValue)); normalizeData(); renderAll(); if (editingId) renderDrawer(); } catch (_) { } }
  });
  // keep the "Today" / "Overdue" labels fresh when the tab is left open overnight
  let day = todayStr(); setInterval(() => { if (todayStr() !== day) { day = todayStr(); renderAll(); } }, 60000);
  renderAll();
  cleanOrphanFiles();
  try { navigator.storage?.persist?.(); } catch (_) { }
}
document.addEventListener('DOMContentLoaded', init);
