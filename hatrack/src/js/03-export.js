/* ============ HatRack — exports ============ */

const EXPORT_FORMATS = [
  { id: 'csv', name: 'Spreadsheet CSV', desc: 'Excel, Google Sheets, Notion, Airtable, ClickUp, Monday, Trello import power-ups', ext: 'csv', mime: 'text/csv' },
  { id: 'todoist', name: 'Todoist CSV', desc: 'Sections, p1–p4, durations, repeats, sub-tasks', ext: 'csv', mime: 'text/csv' },
  { id: 'asana', name: 'Asana CSV', desc: 'Asana’s CSV importer — sections, due dates, details', ext: 'csv', mime: 'text/csv' },
  { id: 'md', name: 'Markdown checklist', desc: 'Obsidian, Notion, GitHub, any notes app', ext: 'md', mime: 'text/markdown' },
  { id: 'txt', name: 'Plain list', desc: 'One task per line — paste into Trello, Apple Reminders, Things', ext: 'txt', mime: 'text/plain' },
  { id: 'ics', name: 'Calendar (.ics)', desc: 'Dated tasks and repeating reminders for Google, Outlook, Apple', ext: 'ics', mime: 'text/calendar' },
  { id: 'json', name: 'HatRack file', desc: 'Re-importable here, with your setup', ext: 'json', mime: 'application/json' },
];
function sectionOptions() {
  return [['l1', `${levelName(1)}`], ['l2', `${levelName(1)} + ${levelName(2)}`], ['path', 'Full path'], ['type', 'Type'], ['priority', 'Priority'], ['status', 'Status'], ['due', 'Due date'], ['none', 'No sections']];
}

/* ---------- grouping ---------- */
function areaPositions() { const pos = {}; areaTreeFlat().forEach(({ a }, i) => pos[a.id] = i + 1); return pos; }
function sectionOf(t, by) {
  const anc = ancestors(t.areaId);
  switch (by) {
    case 'none': return '';
    case 'l1': return anc[0]?.name || 'Unsorted';
    case 'l2': return anc.length ? anc.slice(0, 2).map(a => a.name).join(' / ') : 'Unsorted';
    case 'path': return anc.length ? anc.map(a => a.name).join(' / ') : 'Unsorted';
    case 'type': return T[t.typeId]?.name || 'No type';
    case 'priority': return PR[t.priorityId]?.name || 'No priority';
    case 'status': return ST[t.statusId]?.name || '';
    case 'due': return (DUE_COLS.find(d => d[0] === dueBucket(t)) || ['', ''])[1];
  }
  return '';
}
function sectionRanker(by) {
  const pos = areaPositions();
  const areaAt = (t, n) => { const anc = ancestors(t.areaId); return anc.length ? pos[anc[Math.min(n, anc.length) - 1].id] : 0; };
  switch (by) {
    case 'l1': return t => areaAt(t, 1);
    case 'l2': return t => areaAt(t, 2);
    case 'path': return t => (t.areaId ? pos[t.areaId] || 0 : 0);
    case 'type': return t => { const i = D.types.findIndex(x => x.id === t.typeId); return i < 0 ? 999 : i; };
    case 'priority': return t => prank(t);
    case 'status': return t => D.statuses.findIndex(x => x.id === t.statusId);
    case 'due': return t => DUE_COLS.findIndex(d => d[0] === dueBucket(t));
  }
  return () => 0;
}
/** subtasks stay right under their parent; depth counts parents that are part of the same export */
function hier(list) {
  const inList = new Set(list.map(t => t.id));
  const depthIn = t => taskAncestors(t).filter(a => inList.has(a.id)).length;
  return { depthIn, roots: list.filter(t => depthIn(t) === 0), below: r => taskDescendants(r).filter(c => inList.has(c.id)) };
}
function groupTasks(list, by) {
  const H = hier(list); const rk = sectionRanker(by);
  const sorted = H.roots.slice().sort((a, b) => rk(a) - rk(b) || (by === 'due' ? (a.due || '').localeCompare(b.due || '') : 0) || a.order - b.order);
  const groups = []; let g = null;
  for (const t of sorted) {
    const s = sectionOf(t, by); if (!g || g.name !== s) { g = { name: s, tasks: [], depth: new Map() }; groups.push(g); }
    g.tasks.push(t); g.depth.set(t.id, 0);
    H.below(t).forEach(c => { g.tasks.push(c); g.depth.set(c.id, H.depthIn(c)); });
  }
  return groups;
}

/* ---------- helpers ---------- */
const csvCell = v => { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) || /^\s|\s$/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
const toCSV = rows => rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
const slug = s => String(s || 'all').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'unsorted';
const usDate = s => { const d = parseYMD(s); return d ? `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}` : ''; };
const isoDay = ms => (ms ? ymd(new Date(ms)) : '');
const attText = t => t.attachments.map(a => a.kind === 'link' ? `${a.name ? a.name + ' ' : ''}<${a.url}>` : `${a.name} (file kept in HatRack)`).join('; ');
const subText = (t, sep = '\n') => t.subnotes.map(s => `[${s.done ? 'x' : ' '}] ${s.text}${s.note ? ' — ' + s.note : ''}`).join(sep);
function tokenName(n) { return /[\s"]/.test(n) ? `"${n.replace(/"/g, '')}"` : n; }
function taskLine(t, withTokens = true, noArea = false) {
  if (!withTokens) return t.title;
  const p = [t.title];
  if (!noArea && t.areaId && A[t.areaId]) p.push('@' + tokenName(pathStr(t.areaId, '/')));
  if (T[t.typeId]) p.push('#' + T[t.typeId].name.replace(/\s+/g, '-'));
  if (PR[t.priorityId]) p.push('!' + PR[t.priorityId].name.replace(/\s+/g, '-'));
  if (t.duration) p.push('~' + fmtDur(t.duration).replace(' ', ''));
  if (t.due) p.push('^' + t.due);
  if (t.repeat) p.push('*' + t.repeat);
  (t.tags || []).forEach(g => p.push('#' + String(g).replace(/\s+/g, '-')));
  return p.join(' ');
}
/** plain text with shortcuts; subnotes and subtasks are indented under their task */
function tasksAsText(list, withTokens = true) {
  const out = [];
  const emit = (t, d) => {
    const pad = '    '.repeat(d);
    out.push(pad + (d ? '- ' : '') + taskLine(t, withTokens, d > 0));
    t.subnotes.forEach(s => out.push(`${pad}    - [${s.done ? 'x' : ' '}] ${s.text}`));
    childrenOf(t.id).forEach(c => emit(c, d + 1));
  };
  topmost(list).forEach(t => emit(t, 0));
  return out.join('\n');
}
function metaBits(t, skip = {}) {
  const b = [];
  if (!skip.type && T[t.typeId]) b.push(`${T[t.typeId].icon ? T[t.typeId].icon + ' ' : ''}${T[t.typeId].name}`);
  if (!skip.priority && PR[t.priorityId]) b.push(PR[t.priorityId].name);
  if (!skip.status && ST[t.statusId] && t.statusId !== defaultStatus()) b.push(ST[t.statusId].name);
  if (t.duration) b.push(fmtDur(t.duration));
  if (t.due) b.push('due ' + t.due);
  if (t.repeat) b.push(REPEAT_LABEL[t.repeat].toLowerCase());
  if ((t.seen || 1) > 1) b.push(`noted ×${t.seen}`);
  (t.tags || []).forEach(g => b.push('#' + g));
  D.fields.forEach(f => { const v = t.custom?.[f.id]; if (v !== undefined && v !== '' && v !== false) b.push(`${f.name}: ${v === true ? 'yes' : v}`); });
  return b;
}

/* ---------- builders ---------- */
function buildGenericCSV(groups, opts) {
  const maxDepth = Math.max(3, ...D.areas.map(a => depthOf(a.id)), 0);
  const levels = Array.from({ length: maxDepth }, (_, i) => levelName(i + 1));
  const head = ['Title', 'Notes', 'Subnotes', 'Parent task', ...levels, 'Path', 'Section', 'Type', 'Priority', 'Status', 'Duration (min)', 'Due', 'Repeat', 'Tags', 'Source', 'Times noted', 'Color', 'Attachments', 'Created', 'Updated', ...D.fields.map(f => f.name), 'ID', 'Parent ID'];
  const rows = [head];
  for (const g of groups) for (const t of g.tasks) {
    const anc = ancestors(t.areaId);
    const par = parentOf(t);
    rows.push([t.title, t.notes, subText(t), par ? par.title : '', ...levels.map((_, i) => anc[i]?.name || ''), pathStr(t.areaId), g.name, T[t.typeId]?.name || '', PR[t.priorityId]?.name || '', ST[t.statusId]?.name || '',
      t.duration || '', t.due || '', t.repeat || '', (t.tags || []).join(', '), t.source || '', t.seen || 1, t.color || '', attText(t), isoDay(t.created), isoDay(t.updated),
      ...D.fields.map(f => { const v = t.custom?.[f.id]; return v === true ? 'yes' : v === false ? '' : (v ?? ''); }), t.id, par ? par.id : '']);
  }
  return (opts.bom ? '\uFEFF' : '') + toCSV(rows);
}
function todoistPriority(t) { const n = D.priorities.length; const i = PRANK[t.priorityId]; if (i == null || !n) return 4; if (n === 1) return 1; return 1 + Math.round(i * 3 / (n - 1)); }
function todoistDay(s) { const d = parseYMD(s); const m = MONTHS[d.getMonth()]; return `${m.charAt(0).toUpperCase() + m.slice(1)} ${d.getDate()} ${d.getFullYear()}`; }
function todoistDate(t) {
  if (t.repeat) {
    const ev = { daily: 'every day', weekdays: 'every weekday', weekly: 'every week', biweekly: 'every 2 weeks', monthly: 'every month', quarterly: 'every 3 months', yearly: 'every year' }[t.repeat];
    return t.due ? `${ev} starting ${todoistDay(t.due)}` : ev;
  }
  return t.due || '';
}
function buildTodoist(groups, opts) {
  const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
  const rows = [['TYPE', 'CONTENT', 'DESCRIPTION', 'PRIORITY', 'INDENT', 'AUTHOR', 'RESPONSIBLE', 'DATE', 'DATE_LANG', 'TIMEZONE', 'DURATION', 'DURATION_UNIT']];
  const blank = n => Array(n).fill('');
  if (opts.board) rows.push(['meta', 'view_style=board', ...blank(10)]);
  let count = 0;
  for (const g of groups) {
    if (g.name) rows.push(['section', g.name, ...blank(10)]);
    for (const t of g.tasks) {
      const labels = [...(opts.typeLabel && T[t.typeId] ? [T[t.typeId].name] : []), ...(t.tags || [])].map(l => '@' + String(l).replace(/[\s@]+/g, '_'));
      const desc = [t.notes, t.areaId ? `Filed under: ${pathStr(t.areaId)}` : '', t.source ? `Source: ${t.source}` : '', t.attachments.length ? `Attachments: ${attText(t)}` : ''].filter(Boolean).join('\n\n');
      const d = Math.min(3, g.depth?.get(t.id) || 0);
      rows.push(['task', [t.title, ...labels].join(' '), desc, todoistPriority(t), d + 1, '', '', todoistDate(t), 'en', tz, t.duration || '', t.duration ? 'minute' : 'None']);
      count++;
      for (const s of t.subnotes) if (!s.done) { rows.push(['task', s.text, s.note || '', 4, Math.min(4, d + 2), '', '', '', 'en', tz, '', 'None']); count++; }
    }
  }
  return { text: toCSV(rows), count };
}
function buildAsana(groups) {
  const rows = [['Task Name', 'Description', 'Section', 'Assignee', 'Start Date', 'Due Date', 'Priority', 'Task Type', 'Status', 'Estimated Minutes', 'Tags', 'Area']];
  for (const g of groups) for (const t of g.tasks) {
    const par = parentOf(t);
    const desc = [par ? `Subtask of: ${par.title}` : '', t.notes, t.subnotes.length ? 'Checklist:\n' + t.subnotes.map(s => `${s.done ? '☑' : '☐'} ${s.text}`).join('\n') : '', t.repeat ? `Repeats: ${REPEAT_LABEL[t.repeat]}` : '', t.source ? `Source: ${t.source}` : '', t.attachments.length ? `Attachments: ${attText(t)}` : ''].filter(Boolean).join('\n\n');
    rows.push([t.title, desc, g.name, '', '', usDate(t.due), PR[t.priorityId]?.name || '', T[t.typeId]?.name || '', ST[t.statusId]?.name || '', t.duration || '', (t.tags || []).join(', '), pathStr(t.areaId)]);
  }
  return toCSV(rows);
}
function mdTask(t, skip = {}, indent = '') {
  const meta = metaBits(t, skip);
  const lines = [`${indent}- [${isDone(t) ? 'x' : ' '}] ${t.title}${meta.length ? ' — ' + meta.join(' · ') : ''}`];
  t.subnotes.forEach(s => lines.push(`${indent}    - [${s.done ? 'x' : ' '}] ${s.text}${s.note ? ' — ' + s.note : ''}`));
  if (t.notes) t.notes.split('\n').forEach(l => lines.push(`${indent}    > ${l}`));
  t.attachments.forEach(a => lines.push(`${indent}    - 📎 ${a.kind === 'link' ? `[${a.name || a.url}](${a.url})` : a.name}`));
  return lines.join('\n');
}
function buildMarkdown(groups, by, title) {
  const out = [`# ${title}`, `_Exported from HatRack on ${todayStr()}_`, ''];
  if (by === 'path') { out.push(outlineMarkdown(groups.flatMap(g => g.tasks), null, 2)); return out.join('\n'); }
  const skip = { type: by === 'type', priority: by === 'priority', status: by === 'status' };
  for (const g of groups) { if (g.name) out.push(`## ${g.name}`, ''); g.tasks.forEach(t => out.push(mdTask(t, skip, '    '.repeat(g.depth?.get(t.id) || 0)))); out.push(''); }
  return out.join('\n');
}
/** hierarchical markdown: headings follow the Parent → Entity → Sub-branch tree; subtasks indent under their task */
function outlineMarkdown(list, rootId = null, startLevel = 1) {
  const H = hier(list);
  const emit = (out, t) => { out.push(mdTask(t)); H.below(t).forEach(c => out.push(mdTask(c, {}, '    '.repeat(H.depthIn(c))))); };
  const byArea = new Map(); H.roots.forEach(t => { const k = t.areaId && A[t.areaId] ? t.areaId : ''; (byArea.get(k) || byArea.set(k, []).get(k)).push(t); });
  const has = id => (byArea.get(id) || []).length || descendants(id).some(d => (byArea.get(d.id) || []).length);
  const out = [];
  const rootTasks = byArea.get(rootId || '') || [];
  if (rootTasks.length) { out.push(`${'#'.repeat(startLevel)} ${rootId ? A[rootId].name + ' — not yet sorted' : 'Unsorted'}`, ''); rootTasks.sort((a, b) => a.order - b.order).forEach(t => emit(out, t)); out.push(''); }
  const walk = (pid, lvl) => kids(pid).forEach(a => {
    if (!has(a.id)) return;
    out.push(`${'#'.repeat(Math.min(lvl, 6))} ${a.name}`, '');
    if (a.notes) out.push(a.notes.split('\n').map(l => '> ' + l).join('\n'), '');
    const ts = (byArea.get(a.id) || []).sort((x, y) => x.order - y.order);
    ts.forEach(t => emit(out, t)); if (ts.length) out.push('');
    walk(a.id, lvl + 1);
  });
  walk(rootId, startLevel);
  return out.join('\n');
}
function buildText(groups, withTokens) {
  const out = [];
  for (const g of groups) { if (g.name) out.push(g.name); g.tasks.forEach(t => { const d = g.depth?.get(t.id) || 0; out.push('    '.repeat(d) + (d ? '- ' : '') + taskLine(t, withTokens, d > 0)); }); out.push(''); }
  return out.join('\n').trim() + '\n';
}
function icsEsc(s) { return String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function icsFold(line) {
  const out = []; let s = line;
  while (s.length > 70) { let cut = 70; const c = s.charCodeAt(cut - 1); if (c >= 0xD800 && c <= 0xDBFF) cut--; out.push(s.slice(0, cut)); s = ' ' + s.slice(cut); }
  out.push(s); return out.join('\r\n');
}
function buildICS(list) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const rr = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', quarterly: 'FREQ=MONTHLY;INTERVAL=3', yearly: 'FREQ=YEARLY' };
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HatRack//Task Sorter//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:HatRack tasks'];
  let n = 0;
  for (const t of list) {
    if (!t.due) continue; n++;
    const d = t.due.replace(/-/g, '');
    const desc = [pathStr(t.areaId), metaBits(t).join(' · '), t.notes, t.subnotes.map(s => `${s.done ? '☑' : '☐'} ${s.text}`).join('\n')].filter(Boolean).join('\n\n');
    L.push('BEGIN:VEVENT', `UID:${t.id}@hatrack`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${addDays(t.due, 1).replace(/-/g, '')}`,
      `SUMMARY:${icsEsc((T[t.typeId]?.icon ? T[t.typeId].icon + ' ' : '') + t.title)}`, `DESCRIPTION:${icsEsc(desc)}`, 'TRANSP:TRANSPARENT');
    const top = topOf(t.areaId); if (top) L.push(`CATEGORIES:${icsEsc(top.name)}`);
    if (t.repeat && rr[t.repeat]) L.push(`RRULE:${rr[t.repeat]}`);
    if (t.repeat || norm(T[t.typeId]?.name) === 'reminder') L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(t.title)}`, 'TRIGGER:PT9H', 'END:VALARM');
    L.push('END:VEVENT');
  }
  L.push('END:VCALENDAR');
  return { text: L.map(icsFold).join('\r\n') + '\r\n', count: n };
}
function buildJSON(list) {
  const ids = new Set(list.map(t => t.id));
  return JSON.stringify({ ...clone(D), tasks: D.tasks.filter(t => ids.has(t.id)), exportedAt: new Date().toISOString() }, null, 2);
}

/** returns { files:[{name,text,mime}], notes:[] } */
function buildExport(fmtId, list, opts) {
  const fmt = EXPORT_FORMATS.find(f => f.id === fmtId);
  const by = opts.sections || 'l1';
  const date = todayStr();
  const notes = [];
  const parts = opts.split && ['csv', 'todoist', 'asana', 'md', 'txt'].includes(fmtId) ? groupTasks(list, by === 'none' ? 'l1' : by).map(g => ({ name: g.name, tasks: g.tasks })) : [{ name: '', tasks: list }];
  const files = [];
  for (const p of parts) {
    const groups = groupTasks(p.tasks, by);
    const base = `hatrack-${fmtId === 'csv' ? 'tasks' : fmtId}${p.name ? '-' + slug(p.name) : ''}-${date}`;
    let text = '';
    switch (fmtId) {
      case 'csv': text = buildGenericCSV(groups, opts); break;
      case 'todoist': { const r = buildTodoist(groups, opts); text = r.text; if (r.count > 300) notes.push(`${p.name || 'This file'} has ${r.count} task rows; Todoist imports up to 300 per project. Turn on “One file per section”.`); break; }
      case 'asana': text = buildAsana(groups); break;
      case 'md': text = buildMarkdown(groups, by, opts.title || 'HatRack tasks'); break;
      case 'txt': text = buildText(groups, opts.tokens); break;
      case 'ics': { const r = buildICS(p.tasks); text = r.text; const skipped = p.tasks.length - r.count; if (skipped) notes.push(`${plural(skipped, 'task')} without a due date ${skipped === 1 ? 'is' : 'are'} not in the calendar file.`); break; }
      case 'json': text = buildJSON(p.tasks); break;
    }
    files.push({ name: `${base}.${fmt.ext}`, text, mime: fmt.mime });
  }
  if (list.some(t => t.attachments.some(a => a.kind === 'file')) && fmtId !== 'json') notes.push('Stored files stay in HatRack; exports list their names. Links are exported as URLs.');
  return { files, notes };
}

/* ---------- download & clipboard ---------- */
function downloadText(name, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { } ta.remove(); return ok;
  }
}
