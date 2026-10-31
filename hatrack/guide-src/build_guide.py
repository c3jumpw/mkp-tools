#!/usr/bin/env python3
"""Build the HatRack visual guide from guide-src/shots.json.

Outputs:
  guide.html            full page for the repo (opened from the app's Help menu)
  guide-src/guide-artifact.html   the same content as a fragment, for publishing as a shareable page
"""
import html, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
M = json.loads((ROOT / 'guide-src' / 'shots.json').read_text())
e = html.escape
_eager = {'overview'}

# ---------------------------------------------------------------- components
def fig(name, legend=(), caption='', alt='', size='wide', cols=2, zoom=None):
    """an annotated screenshot. legend: [(pin key, title, text)]"""
    m = M[name]
    pins, items = [], []
    for i, (key, title, text) in enumerate(legend, 1):
        p = next((p for p in m['pins'] if p['key'] == key), None)
        if not p:
            raise SystemExit(f'missing pin {name}:{key}')
        bx = p['box']
        pins.append(f'<span class="hlbox" data-n="{i}" style="left:{bx[0]}%;top:{bx[1]}%;width:{bx[2]}%;height:{bx[3]}%"></span>'
                    f'<button class="pin" type="button" data-n="{i}" style="left:{p["x"]}%;top:{p["y"]}%" aria-label="{e(title)}">{i}</button>')
        items.append(f'<li data-n="{i}"><span class="num">{i}</span><div><b>{title}</b> {text}</div></li>')
    lazy = '' if name in _eager else ' loading="lazy"'
    w, h = m['w'], m['h']
    z = zoom if zoom is not None else (1.45 if size == 'narrow' and m['css_w'] < 330 else 1)
    mw = round(min(m['css_w'] * z, m['w'] / 1.6 if z > 1 else m['css_w']))
    out = [f'<figure class="shot {size}" data-shot="{name}">',
           f'<div class="frame" style="max-width:{mw}px"><img src="guide/{name}.webp" width="{w // 2}" height="{h // 2}" alt="{e(alt or caption)}"{lazy} decoding="async">{"".join(pins)}</div>']
    if caption: out.append(f'<figcaption>{caption}</figcaption>')
    if items: out.append(f'<ol class="legend c{cols}">{"".join(items)}</ol>')
    out.append('</figure>')
    return ''.join(out)

def strip(name, steps):
    """a before / during / after sequence"""
    cells = ''.join(f'<li><img src="guide/{name}-{i}.webp" width="{M[f"{name}-{i}"]["w"] // 2}" height="{M[f"{name}-{i}"]["h"] // 2}" alt="{e(t)}" loading="lazy" decoding="async"><p><span class="step">{i}</span>{t}</p></li>'
                    for i, t in enumerate(steps, 1))
    return f'<ol class="strip">{cells}</ol>'

def section(id_, role, title, body, kicker=''):
    tag = {'user': '<span class="role-tag user">Daily use</span>', 'admin': '<span class="role-tag admin">Setting up</span>', 'all': '<span class="role-tag all">Everyone</span>'}[role]
    return f'<section id="{id_}" data-role="{role}" class="sec"><header class="sec-h">{tag}<h2>{title}</h2>{f"<p class=lede>{kicker}</p>" if kicker else ""}</header>{body}</section>'

def keys(*ks): return ''.join(f'<kbd>{k}</kbd>' for k in ks)

TOC = [
    ('start', 'all', 'HatRack in one minute'), ('concepts', 'all', 'How work is organized'),
    ('capture', 'user', 'Capture tasks'), ('import', 'user', 'Import long lists'), ('triage', 'user', 'Triage'),
    ('board', 'user', 'Sort on the board'), ('subtasks', 'user', 'Subtasks & subnotes'), ('editor', 'user', 'The task editor'),
    ('views', 'user', 'List, Outline, Reports'), ('export', 'user', 'Export'),
    ('admin', 'admin', 'Setting up'), ('admin-groups', 'admin', 'Groups & levels'), ('admin-types', 'admin', 'Types, priorities, statuses'),
    ('admin-fields', 'admin', 'Custom fields'), ('admin-data', 'admin', 'Backups & templates'), ('admin-deploy', 'admin', 'Put it online'),
    ('keys', 'all', 'Keyboard'), ('mobile', 'all', 'Phones & dark mode'), ('faq', 'all', 'Questions'), ('whats-new', 'all', 'What’s new'),
]

# ---------------------------------------------------------------- content
S = []

S.append(section('start', 'all', 'HatRack in one minute', f'''
<p>HatRack is a sorting table for everything you’ve written down. Paste in lists from notes apps, emails and notebooks, hang each item on the business, project or part of life it belongs to, then hand the finished lists to the task app you already use. It runs in your browser and keeps your data on your device.</p>
{fig("overview", [
    ("views", "Views.", "Board for sorting, List for editing in a table, Outline for a printable document, Reports for the numbers."),
    ("quick", "Quick add.", "Type a task and press Enter. Shortcuts like <code>@group</code>, <code>!high</code> and <code>^fri</code> fill in the details."),
    ("import", "Import.", "Paste a long list, or open a .txt, .md or .csv file."),
    ("triage", "Triage.", "Sort unsorted tasks one at a time. The badge shows how many are waiting."),
    ("export", "Export.", "Send tasks to Todoist, Asana, a spreadsheet, a calendar and more."),
    ("configure", "Configure.", "Groups, types, priorities, statuses, durations, custom fields and backups. Usually set up once."),
    ("help", "Help.", "Opens this guide or the shortcuts sheet."),
    ("scope", "Where you are.", "The whole rack, or a group you’ve opened. Click any part to go back up."),
    ("layout", "Columns, rows and order.", "Choose what the columns mean, add rows to make a grid, and pick how cards are ordered."),
    ("filters", "Search and filters.", "Narrow by words, type, priority, status or due date. Shows open tasks by default."),
    ("options", "Options.", "Compact cards, expand or collapse every card, and whether dropping moves or copies."),
    ("inbox", "Unsorted.", "New tasks wait here until you give them a home."),
    ("colhead", "A group.", "Click its name to open it and sort into the next level down. Shows the task count and estimated hours."),
    ("card", "A task card.", "Click to open the editor. Drag to move it."),
    ("more", "Folded details.", "Notes, subnotes and subtasks stay tucked away until you expand the card."),
    ("color", "Card color.", "Tint any card so it stands out."),
], caption="The board with the sample rack loaded. Hover or tap a number to find each part.", cols=2)}
<h3>Who does what</h3>
<div class="roles">
  <div class="role user"><h4>Daily use</h4><p class="muted">Anyone sorting their own work</p>
    <ul><li>Capture and import notes</li><li>Triage and sort on the board</li><li>Nest subtasks; add notes, links and files</li><li>Review in List, Outline and Reports</li><li>Export to Todoist, Asana, spreadsheets, calendars</li></ul>
    <a href="#capture" class="go">Start with capturing</a></div>
  <div class="role admin"><h4>Setting up</h4><p class="muted">Whoever owns the structure and the backups</p>
    <ul><li>Name the levels; add parents, entities and sub-branches</li><li>Write keywords so imports sort themselves</li><li>Choose task types, priorities, statuses, durations, custom fields</li><li>Back up, restore, and share a setup template with a team</li><li>Put HatRack online and install it on phones</li></ul>
    <a href="#admin" class="go">Go to setting up</a></div>
</div>
<p class="note">HatRack has no logins or permissions. “Admin” here means the person who sets up the groups and looks after backups. On a team, that person shares a setup template so everyone sorts into the same structure.</p>
<h3>The daily loop</h3>
<ol class="loop">
  <li><b>Capture</b><span>Quick add, or jot notes anywhere you like.</span></li>
  <li><b>Import</b><span>Paste the pile. Headings and keywords sort most of it.</span></li>
  <li><b>Triage</b><span>Hang up the leftovers, one key press each.</span></li>
  <li><b>Sort &amp; refine</b><span>Drag, nest subtasks, set dates and time.</span></li>
  <li><b>Export</b><span>Send each sector to the app you work in.</span></li>
</ol>
{fig("empty", [("paste", "Paste your notes", "opens Import."), ("setup", "Set up your groups", "opens Configure."), ("sample", "Explore with sample data", "loads four example businesses and obligations to practise on."), ("guide", "The guide", "opens right inside HatRack.")], caption="What you see the first time. Everything stays in the browser.", size="mid", cols=1)}
''', 'Capture everything, sort it onto the right hat, export it where you work.'))

S.append(section('concepts', 'all', 'How work is organized', f'''
<div class="tree">
  <div class="tree-col">
    <h4>Groups — where a task belongs</h4>
    <div class="lvl l1"><span class="lname">Parent</span><b>Northside Coffee Co.</b><small>a business, organization, obligation, or “Personal”</small>
      <div class="lvl l2"><span class="lname">Entity</span><b>Wholesale</b><small>a department, client or project</small>
        <div class="lvl l3"><span class="lname">Sub-branch</span><b>Grocery accounts</b><small>anything finer</small></div></div></div>
    <p class="muted sm">Rename the levels in Configure — Business › Department › Project, for example.</p>
  </div>
  <div class="tree-col">
    <h4>Tasks — what needs doing</h4>
    <div class="node task"><b>Draft the 2027 price sheet</b><small>type · priority · status · time · due · repeat · tags · source · color · notes · attachments</small>
      <div class="node sub"><b>Collect green coffee costs</b><small>a subtask: a full task with its own date and status — up to three levels deep</small>
        <div class="node note">☐ Send the draft to Dana<small>a subnote: a quick checklist line</small></div></div></div>
    <p class="muted sm">Give a step its own date, priority or status? Make it a subtask. Just a box to tick? A subnote.</p>
  </div>
</div>
<h3>Reading a card</h3>
<div class="pair">
{fig("card-anatomy", [
    ("type", "Type icon.", "⏰ Reminder, 💡 Idea, 📞 Follow-up and so on — set them in Configure."),
    ("title", "Title.", "Up to three lines show; longer titles fold."),
    ("path", "Where it lives", "below the column you’re looking at."),
    ("priority", "Priority.", ""), ("due", "Due date", "in plain words: Today, Tomorrow, Fri, Nov 14. Overdue turns red."),
    ("repeat", "Repeats.", "Marking it done schedules the next date instead of closing it."),
    ("time", "Estimated time.", ""), ("seen", "Noted ×3.", "You wrote this down three times; HatRack merged the copies into one card."),
    ("check", "Select box.", "Appears on hover, and always on touch screens."),
    ("stripe", "Group stripe", "in the parent’s color. The pink tint is the card’s own color."),
], size="narrow", cols=1)}
<div class="stack">
<div class="duo">
{fig("long-collapsed", [("clamp", "Three lines,", "then it folds."), ("showall", "Show all", "opens the full text.")], size="tiny", cols=1)}
{fig("long-expanded", [("less", "Show less", "folds it again.")], size="tiny", cols=1)}
</div>
<p class="muted sm">Long entries never take over a column. Options → <b>Expand every card</b> opens them all at once; <b>Collapse every card</b> gets the space back.</p>
</div>
</div>
<h3>Folded and expanded</h3>
<div class="pair">
{fig("card-collapsed", [("more", "The summary", "tells you what’s folded inside: subtasks, subnotes, notes."), ("tint", "A card color", "(yellow here).")], size="narrow", cols=1)}
{fig("card-expanded", [
    ("less", "Show less", "folds the card."), ("notes", "Notes,", "with clickable links."), ("subnotes", "Subnotes", "tick off right on the card."),
    ("subtask", "Subtasks.", "Click one to open it; drag it to move or re-nest it."), ("done", "Done box", "for a subtask."),
    ("add", "+ Subtask", "adds another. Shortcuts work."),
], size="narrow", cols=1)}
</div>
''', 'Two trees: groups say where a task belongs; tasks can hold subtasks and subnotes.'))

TOKENS = [('Email Greenway about the holiday order', 'Title', 'plain'), ('@wholesale', 'Group — matches the start of a name', 'at'),
          ('!high', 'Priority — a name, or !1 for the first', 'bang'), ('^fri', 'Due — today, tomorrow, fri, 11/14, nov14, +3d, eom', 'caret'),
          ('~20m', 'Time — 15m, 1h30m, 2d', 'tilde'), ('#client', 'Tag — or a type, if it matches one (#Reminder)', 'hash')]
tok_html = '<div class="tokens">' + ''.join(f'<span class="tok {c}"><code>{e(t)}</code><small>{e(l)}</small></span>' for t, l, c in TOKENS) + '</div>'
S.append(section('capture', 'user', 'Capture tasks', f'''
{fig("quickadd", [], caption="Quick add, at the top of every page. Press N or / to jump to it.", size="mid")}
{tok_html}
<table class="tbl">
<thead><tr><th>Type</th><th>Means</th><th>Examples</th></tr></thead>
<tbody>
<tr><td><code>@</code></td><td>Group</td><td><code>@northside</code> <code>@Ledgerline/Admin</code> <code>@"Home &amp; personal"</code></td></tr>
<tr><td><code>#</code></td><td>Type, or a tag</td><td><code>#Reminder</code> <code>#idea</code> <code>#client</code></td></tr>
<tr><td><code>!</code></td><td>Priority</td><td><code>!high</code> <code>!1</code> <code>!someday</code></td></tr>
<tr><td><code>~</code></td><td>Estimated time</td><td><code>~15m</code> <code>~1h30m</code> <code>~2d</code></td></tr>
<tr><td><code>^</code></td><td>Due date</td><td><code>^today</code> <code>^fri</code> <code>^11/14</code> <code>^+3d</code> <code>^eom</code></td></tr>
<tr><td><code>*</code></td><td>Repeats</td><td><code>*daily</code> <code>*weekdays</code> <code>*weekly</code> <code>*monthly</code> <code>*yearly</code></td></tr>
</tbody></table>
<ul class="tips">
<li><b>Words work too.</b> “Remind me to…” becomes a Reminder. A line starting <code>Idea:</code> or <code>Follow-up:</code> sets the type. “every Monday” sets a weekly repeat.</li>
<li><b>Add into a column.</b> Every column has <b>+ Add</b> at the bottom; a task added there takes that column’s value.</li>
<li><b>Paste from anywhere.</b> Copy text in any app and press {keys("Ctrl/⌘", "V")} on the board. One line becomes a task; several lines open Import. Hover a column first to send it there.</li>
<li><b>Drop files.</b> Drag a .txt, .md or .csv file onto a column to import it into that column.</li>
</ul>
''', 'Quick add takes plain language plus a few shortcuts.'))

S.append(section('import', 'user', 'Import long lists', f'''
{fig("import", [
    ("text", "Paste here.", "Messy is fine: headings, bullets, indents, checkboxes."),
    ("file", "Or open files", "— .txt, .md or .csv. You can drag them onto the box too."),
    ("layout", "Layout.", "Let HatRack work it out, or choose one task per line, blocks split by blank lines, or spreadsheet rows."),
    ("plain", "Group lines.", "When a plain line with items under it counts as a group."),
    ("base", "Start from a group.", "Headings and keywords then sort inside it."),
    ("nest", "Indented lines", "become subnotes (a checklist) or subtasks (full tasks)."),
    ("dup", "Repeats.", "Merge into one card and count them, keep every copy, or skip them."),
    ("checks", "Switches.", "Read shortcuts, auto-sort by keywords, create new groups from headings."),
    ("summary", "The summary", "says what will happen before anything is saved."),
    ("auto", "auto", "means a keyword placed it; <b>new</b> marks a group this import will create."),
    ("repeat", "Repeat badges", "show which lines merge."),
    ("go", "Import.", "Undo works afterwards too."),
    ("help", "How this works", "opens this guide at the right section — every dialog has one."),
], caption="Import with a typical brain-dump pasted in.")}
<div class="reads">
<h3>What HatRack reads</h3>
<table class="tbl">
<thead><tr><th>You write</th><th>HatRack makes</th></tr></thead>
<tbody>
<tr><td><code>Northside:</code> · <code># Personal</code> · <code>## Health</code> · <code>NEW VENTURE</code></td><td>A group (matched to an existing one by name or keyword, or created)</td></tr>
<tr><td><code>- item</code> · <code>1. item</code> · <code>[ ] item</code></td><td>A task. <code>[x]</code> marks it done.</td></tr>
<tr><td>Lines indented under a task</td><td>Subnotes, or subtasks if you choose — several levels deep</td></tr>
<tr><td>Blocks split by blank lines</td><td>First line is the title, the rest becomes notes</td></tr>
<tr><td>Spreadsheet rows with a header</td><td>Columns mapped by name: Title, Notes, Project, Due, Priority, Estimate, Tags, Color, Parent ID…</td></tr>
<tr><td>A Todoist CSV export</td><td>Sections, priorities, dates, durations and sub-tasks</td></tr>
</tbody></table>
</div>
''', 'Paste a pile of notes and watch them sort themselves.'))

S.append(section('triage', 'user', 'Triage', f'''
{fig("triage", [
    ("progress", "Progress.", ""), ("card", "The task.", "Fix the title right here."),
    ("groups", "Pick a group.", "Groups marked › have another level: you pick again to go deeper."),
    ("key", "Number keys", "1–9 pick a group."), ("new", "+ New", "makes a group on the spot."),
    ("type", "Type and priority.", "Press T or P to cycle through them."), ("due", "Quick dates", "or pick one."),
    ("skip", "Skip", "(S), Back (←), Mark done (D), Delete."), ("auto", "Jump ahead", "moves to the next task once you’ve picked the last level."),
    ("next", "Next", "(Enter) keeps what you chose."),
], caption="Press T anywhere to start.", size="mid")}
<p class="tip-line">Open a group first (click its column name) and Triage sorts only that group’s “not yet sorted” tasks into its entities.</p>
''', 'One task at a time, one key press each. The fastest way through a long list.'))

S.append(section('board', 'user', 'Sort on the board', f'''
<div class="zones">
  <div class="zone-col">
    <div class="z-colhead">Northside Coffee Co.</div>
    <div class="z-card"><span class="z-band top">Top edge — place above</span><span class="z-band mid">Middle — make it a subtask</span><span class="z-band bot">Bottom edge — place below</span></div>
    <div class="z-gap">Anywhere else in the column — move here</div>
  </div>
  <ul class="z-notes">
    <li><b>Columns set values.</b> Drop on “High” and the task becomes high priority; drop on a group and it moves there.</li>
    <li><b>Copy instead of move:</b> hold {keys("Alt/Option")} as you drop, or choose Options → “Dropping copies the card”.</li>
    <li><b>Several at once:</b> select cards first, then drag any one of them.</li>
    <li><b>Subtasks:</b> drag one out onto a column to make it a top-level task again.</li>
  </ul>
</div>
<h3>Move a card</h3>
{strip("move", ["Pick up the card.", "The column lights up and a line shows where it will land.", "Dropped. It now belongs to Northside Coffee Co."])}
<h3>Nest a card under another</h3>
{strip("nest", ["Drag a card toward another card.", "Over the middle, the target turns green: “Make it a subtask”.", "It now lives inside that card, keeping its own dates and status."])}
<h3>Open a group to sort deeper</h3>
{fig("drill", [("crumbs", "Breadcrumb.", "Click “Whole rack” to go back up."), ("notyet", "Not yet sorted:", "tasks filed under the parent but not an entity."), ("sub", "Each entity", "is now a column. Its sub-branches open the same way.")])}
<h3>Columns × rows</h3>
{fig("grid", [("cols", "Columns", "set to Priority."), ("rows", "Rows", "set to Parent."), ("colhead", "Each column", "is a priority."), ("lane", "Each row", "is a parent."), ("cell", "Drop in a cell", "to set both at once.")], caption="Any field can be columns or rows: level, type, priority, status, duration, due date, or a custom dropdown.")}
<h3>Select and act in bulk</h3>
{fig("selection", [
    ("sel", "Selected cards.", "Ctrl/⌘-click, Shift-click for a range, or the tick box."), ("keys", "Number keys", "1–9 send the selection to that column."),
    ("move", "Move to", "any group at any level."), ("nest", "Nest under", "a task you pick from a list — handy on phones."),
    ("color", "Color", "the whole selection."), ("more", "Export", "just these. Also Copy, Duplicate and Delete."),
])}
<div class="pair">
{fig("context-menu", [("colors", "Card color.", ""), ("add", "Add a subtask.", ""), ("nest", "Nest under", "another task, wherever it is."), ("move", "Move to", "any group."), ("dup", "Duplicate", "copies subtasks too.")], caption="Right-click any card (long-press on Android).", size="narrow", cols=1)}
<div class="stack"><h3>Copy and paste cards</h3>
<ul class="tips">
<li>{keys("Ctrl/⌘", "C")} copies selected cards, subtasks included.</li>
<li>Hover a column and press {keys("Ctrl/⌘", "V")} to paste them there.</li>
<li>Paste into another app and you get plain text with shortcuts, ready to re-import.</li>
<li>Each column’s ⋯ menu copies the whole column as a list or a Markdown checklist, or exports it.</li>
</ul></div>
</div>
''', 'Drag to move, drop on a card to nest, open groups to go deeper.'))

S.append(section('subtasks', 'user', 'Subtasks & subnotes', f'''
<table class="tbl compare">
<thead><tr><th></th><th>Subtask</th><th>Subnote</th></tr></thead>
<tbody>
<tr><td>Own type, priority, status, time, due date, repeat</td><td class="y">Yes</td><td class="n">No</td></tr>
<tr><td>Can hold its own subtasks</td><td class="y">Up to three levels</td><td class="n">No</td></tr>
<tr><td>Shows on the board</td><td>Inside its parent’s card</td><td>Inside its card, as a checklist</td></tr>
<tr><td>In exports</td><td>Indented under the parent (Todoist sub-tasks)</td><td>Checklist lines</td></tr>
<tr><td>Best for</td><td>Steps that need their own date or owner</td><td>Quick boxes to tick</td></tr>
</tbody></table>
<div class="cols2">
<div><h3>Make a subtask</h3><ul class="tips">
<li>Drag a card onto the middle of another card — on the board or in the outline.</li>
<li>Expand a card and click <b>+ Subtask</b>.</li>
<li>Type it into the editor’s Subtasks box. Shortcuts work.</li>
<li>Right-click → <b>Nest under another task…</b></li>
<li>Import with “Indented lines become subtasks”.</li>
<li>Turn a subnote into a subtask with ⇪ in the editor.</li></ul></div>
<div><h3>Undo it</h3><ul class="tips">
<li>Drag it out onto a column, or onto a group heading in the outline.</li>
<li>⇱ <b>Make top-level</b> in the editor or the right-click menu.</li>
<li>⇩ <b>Turn into a subnote</b> when it doesn’t need its own fields.</li>
<li>{keys("Ctrl/⌘", "Z")} undoes any move.</li></ul></div>
</div>
<ul class="rules">
<li>Subtasks always share their parent’s group. Move the parent and they come along.</li>
<li>Deleting a task deletes its subtasks — Undo brings them all back.</li>
<li>When a repeating task moves to its next date, its subtasks and subnotes reset to not done.</li>
</ul>
{fig("editor-child", [("parent", "The parent link.", "A subtask’s editor shows where it sits and links back up.")], size="mid", cols=1)}
''', 'Subtasks are full tasks inside another task. Subnotes are a simple checklist.'))

S.append(section('editor', 'user', 'The task editor', f'''
<div class="pair wide-left">
{fig("editor", [
    ("path", "Where it lives.", "For a subtask, this also links to its parent."), ("title", "Title.", ""),
    ("where", "Where it belongs:", "any group at any level."), ("fields", "Details:", "type, priority, status, time, due, repeat, tags, source and your custom fields."),
    ("color", "Card color.", ""), ("notes", "Notes,", "as long as you like. The card shows them only when expanded."),
    ("subtasks", "Subtasks.", "Tick, open, ⇱ make top-level, ⇩ turn into a subnote, ✕ delete."), ("addsub", "Add a subtask.", "Shortcuts work."),
    ("subnotes", "Subnotes.", "✎ gives one its own note; ⇪ turns it into a subtask."), ("atts", "Attachments.", "Links to Drive, Dropbox or anything; files are kept in this browser."),
    ("foot", "Mark done", "(for repeats: schedule the next one), Duplicate, Copy, Delete."),
], size="narrow", cols=1)}
<div class="stack"><p>Click any card or list row to open it. Changes save as you type; <kbd>Esc</kbd> closes the editor, and {keys("Ctrl/⌘", "Z")} undoes the whole editing session.</p>
<p class="note">Attachments need nothing extra: links are saved with the task, and files go into the browser’s own storage. Files don’t travel between devices on their own — tick “Include stored attachment files” when you back up.</p></div>
</div>
''', 'Everything about one task, in a panel on the right.'))

S.append(section('views', 'user', 'List, Outline and Reports', f'''
<h3>List</h3>
{fig("list", [("sort", "Sort", "by any column; click again to reverse."), ("edit", "Change values in place:", "group, type, priority, status."), ("child", "Subtasks", "show ↳ and the parent’s name."), ("check", "Select rows", "for the bulk actions bar.")])}
<h3>Outline</h3>
{fig("outline", [
    ("actions", "Copy as Markdown,", "download it, or print / save as PDF."), ("grip", "Drag handle.", "Drag a task to move or nest it."),
    ("heading", "Drop on a heading", "to move a task — or a subnote — into that group."), ("children", "Subtasks", "indent under their task."),
    ("nest", "Drop on the middle", "of a row to make it a subtask."), ("before", "Drop on the top or bottom edge", "to place it before or after."),
])}
<p class="tip-line">Subnotes drag too: drop one on another task to move it there, or on a heading to turn it into a task of its own.</p>
<h3>Reports</h3>
{fig("reports", [("stats", "Counts:", "open, unsorted, overdue, due this week, estimated hours."), ("bygroup", "Open work by group", "— click a name to open it."), ("overdue", "Overdue.", ""), ("next", "The next 14 days,", "by date."), ("keep", "Things you keep writing down", "— the merged repeats. Often a sign something needs a decision.")])}
''', 'The same tasks as a table, a document, or a set of numbers.'))

EXPORTS = [
    ('Todoist', 'Todoist CSV', 'Project → ⋯ → Import from CSV. Sections, p1–p4, dates, durations and sub-tasks come across. Todoist takes 300 tasks per project — turn on “One file per section”.'),
    ('Asana', 'Asana CSV', 'Project → Add tasks via → CSV, then map Section and Due Date. Subtasks arrive as tasks marked “Subtask of …”.'),
    ('Excel, Google Sheets, Notion, Airtable, ClickUp, Monday', 'Spreadsheet CSV', 'Use the app’s CSV importer. Every level, the parent task and the color are their own columns.'),
    ('Trello, Apple Reminders, Things, Microsoft To Do', 'Plain list', 'Paste it: each line becomes a card or to-do.'),
    ('Obsidian, Notion, GitHub issues', 'Markdown checklist', 'Paste it or open the .md file. Checkboxes stay checkable.'),
    ('Google, Outlook or Apple Calendar', 'Calendar (.ics)', 'Dated tasks become all-day events; repeating reminders keep their schedule with a 9 am alert.'),
    ('Another computer', 'HatRack file', 'Configure → Data → Restore.'),
]
S.append(section('export', 'user', 'Export', f'''
{fig("export", [
    ("formats", "Pick a format.", ""), ("scope", "Which tasks:", "on screen now, everything, a selection, or one column."),
    ("sections", "Sections:", "by parent, parent + entity, full path, type, priority, status or due date."), ("done", "Include done tasks", "if you need them."),
    ("split", "One file per section", "— one project per business, for example."), ("howto", "How to import", "into the app you picked."),
    ("preview", "Preview", "of the file."), ("copy", "Copy", "to paste straight in."), ("download", "Download", "the file — or files."),
], caption="Export with Todoist selected.")}
<h3>Where is it going?</h3>
<table class="tbl exports"><thead><tr><th>Destination</th><th>Choose</th><th>Then</th></tr></thead><tbody>
{"".join(f"<tr><td>{e(a)}</td><td><b>{e(b)}</b></td><td>{e(c)}</td></tr>" for a, b, c in EXPORTS)}
</tbody></table>
''', 'Send each sector to the app you work in.'))

S.append(section('admin', 'admin', 'Setting up HatRack', '''
<p>Most of this happens once, in <b>Configure</b> (top right). Whoever does it is the “admin” for this guide — there are no accounts or permissions in HatRack.</p>
<ol class="checklist">
<li><b>Name your levels.</b> Parent › Entity › Sub-branch, or your own words.</li>
<li><b>Add your groups.</b> Every business, organization, obligation and “Personal”, then what sits inside each.</li>
<li><b>Write keywords.</b> The words that should send a note to each group.</li>
<li><b>Tune the lists.</b> Task types, priorities, statuses and time estimates.</li>
<li><b>Add custom fields</b> if you track anything else — client, energy, location.</li>
<li><b>Share a setup template</b> so others start with the same structure.</li>
<li><b>Put HatRack online</b> and add it to your phone’s home screen.</li>
</ol>
''', 'A short checklist, then the details.'))

S.append(section('admin-groups', 'admin', 'Groups & levels', fig("cfg-groups", [
    ("nav", "Configure sections.", ""), ("levels", "Level names.", "Rename them to match how you talk."),
    ("color", "Color", "for a parent; its entities inherit it."), ("name", "Name.", ""),
    ("kw", "Keywords.", "Comma-separated words that send a note here. The deepest match wins; group names count too."),
    ("count", "Task count,", "including deeper levels."), ("notes", "Notes", "about the group. They show in the outline."),
    ("order", "↑ ↓", "change the order."), ("nest", "⇥ ⇤", "move a group inside the one above, or back out a level."),
    ("add", "＋", "adds a group inside this one."), ("del", "✕ deletes.", "Its tasks move up to the parent; its sub-groups move up a level."),
    ("addtop", "+ Add parent.", ""), ("how", "How this works", "opens this guide here."),
], caption="Configure → Groups & levels, with the sample rack.") + '<p class="tip-line">Keywords make imports sort themselves. Give each entity a few words that only it would use — “grocer, distributor, price sheet” for Wholesale.</p>',
'The tree every task hangs on.'))

S.append(section('admin-types', 'admin', 'Types, priorities, statuses and durations', f'''
{fig("cfg-types", [("icon", "Icon", "shown on cards."), ("color", "Color.", ""), ("name", "Name.", "Typing <code>#name</code> or “Name:” sets it."), ("kw", "Keywords", "that set the type on import — “remind me” makes a Reminder.")], size="mid")}
{fig("cfg-statuses", [("done", "Counts as done.", "Done statuses drop out of the Open filter."), ("order", "Order", "is your workflow, left to right on the board.")], size="mid")}
<ul class="tips">
<li id="admin-priorities"><b>Priorities:</b> the top one is most important, and <code>!1</code> means the first. The Todoist export spreads them across p1–p4.</li>
<li id="admin-statuses"><b>Statuses:</b> keep at least one that isn’t done. Marking a repeating task done schedules its next date instead.</li>
<li id="admin-durations"><b>Durations:</b> the time estimates people pick from. Grouped by duration, each is a column and a task lands in the smallest one that fits.</li>
</ul>
''', 'The lists people pick from on every task.'))

S.append(section('admin-fields', 'admin', 'Custom fields', fig("cfg-fields", [("kind", "Field type:", "text, number, date, dropdown or checkbox."), ("options", "Dropdown options,", "comma-separated.")], size="mid", cols=2)
 + fig("field-columns", [("cols", "Dropdown fields", "can become board columns or rows.")], caption="An “Energy” dropdown used as columns: sort by how much focus each task needs."),
 'Track anything else: client, energy, location, cost.'))

S.append(section('admin-data', 'admin', 'Backups & setup templates', f'''
{fig("cfg-data", [("backup", "Download backup:", "everything, optionally with stored files."), ("template", "Download setup template:", "groups, levels, keywords, types, priorities, statuses, durations and fields — no tasks."), ("restore", "Restore", "a backup (merge or replace) or apply a template."), ("wipe", "Delete everything.", "Undo works until you close the tab.")], size="mid")}
<div class="flows">
  <div class="flow"><h4>Move to another device</h4>
    <div class="fl"><span class="box">This browser</span><span class="arr">Download backup</span><span class="box file">hatrack-backup.json</span><span class="arr">Restore</span><span class="box">Other device</span></div>
    <p class="muted sm"><b>Merge</b> adds what’s missing (groups and types with the same name are combined). <b>Replace</b> swaps everything.</p></div>
  <div class="flow"><h4>Give a team the same structure</h4>
    <div class="fl"><span class="box admin">Admin</span><span class="arr">Download setup template</span><span class="box file">hatrack-setup.json</span><span class="arr">Share by email, Drive, Slack</span><span class="box">Each person: Restore → Apply setup</span></div>
    <p class="muted sm">Applying adds anything missing, matched by name, and keeps everyone’s own tasks.</p></div>
</div>
<div class="warn"><b>Where the data lives.</b> In this browser, at this web address. A different browser, device or address starts empty, and clearing site data erases it. Download a backup now and then.</div>
''', 'Your data never leaves the browser unless you download it.'))

FILES = [('index.html', 'the app'), ('guide.html', 'this guide'), ('guide/', 'its screenshots — keep the folder'), ('apple-touch-icon.png', 'iPhone home-screen icon'),
         ('icon-192.png · icon-512.png', 'Android and desktop icons'), ('manifest.webmanifest', 'makes it installable'), ('.nojekyll', 'tells GitHub to serve files as-is'), ('README.md', 'notes for the repository')]
S.append(section('admin-deploy', 'admin', 'Put HatRack online', f'''
<div class="pair">
<div><h3>The files</h3><ul class="files">{"".join(f"<li><code>{e(a)}</code><span>{e(b)}</span></li>" for a, b in FILES)}</ul></div>
<div><h3>GitHub Pages</h3><ol class="checklist">
<li>Create a repository on GitHub.</li>
<li>Upload every file and the <code>guide</code> folder from the download.</li>
<li>Settings → Pages → Deploy from a branch → <b>main</b>, <b>/ (root)</b> → Save.</li>
<li>After a minute, open <code>https://your-name.github.io/repository-name/</code>.</li></ol>
<p class="muted sm">Any static host works the same way. You can also just double-click <code>index.html</code> on your computer.</p></div>
</div>
<div class="install">
<img src="apple-touch-icon.png" width="90" height="90" alt="The HatRack app icon: a white hat with an amber band hanging on a rack, on green">
<div><h3>Add it to a phone</h3>
<p><b>iPhone:</b> open the address in Safari → Share → <b>Add to Home Screen</b>. <b>Android:</b> Chrome menu → <b>Add to Home screen</b> or <b>Install app</b>.</p>
<p class="muted sm">The home-screen app keeps its own data, separate from the browser tab. Move tasks across with Backup → Restore.</p></div>
</div>
''', 'Free hosting on GitHub Pages, plus an icon for your phone.'))

S.append(section('keys', 'all', 'Keyboard', f'''
<div class="keys">
<div><h4>Anywhere</h4><dl>
<dt>{keys("N")} or {keys("/")}</dt><dd>Quick add</dd><dt>{keys("I")}</dt><dd>Import</dd><dt>{keys("T")}</dt><dd>Triage</dd><dt>{keys("E")}</dt><dd>Export</dd>
<dt>{keys("G")}</dt><dd>This guide</dd><dt>{keys("?")}</dt><dd>Shortcuts sheet</dd><dt>{keys("Ctrl/⌘", "Z")}</dt><dd>Undo</dd><dt>{keys("Esc")}</dt><dd>Close, or clear the selection</dd></dl></div>
<div><h4>Cards</h4><dl>
<dt>{keys("Ctrl/⌘")}-click</dt><dd>Select one more</dd><dt>{keys("Shift")}-click</dt><dd>Select a range</dd><dt>{keys("Ctrl/⌘", "A")}</dt><dd>Select all shown</dd>
<dt>{keys("1")}–{keys("9")}</dt><dd>Send the selection to that column</dd><dt>{keys("Ctrl/⌘", "C")} {keys("V")}</dt><dd>Copy, paste into the hovered column</dd>
<dt>{keys("Ctrl/⌘", "D")}</dt><dd>Duplicate</dd><dt>{keys("Delete")}</dt><dd>Delete</dd><dt>{keys("→")} {keys("←")}</dt><dd>Expand or fold the focused card</dd></dl></div>
<div><h4>Triage</h4><dl>
<dt>{keys("1")}–{keys("9")}</dt><dd>Pick a group</dd><dt>{keys("Enter")}</dt><dd>Next</dd><dt>{keys("⌫")}</dt><dd>Up a level</dd><dt>{keys("T")} {keys("P")}</dt><dd>Cycle type, priority</dd>
<dt>{keys("S")}</dt><dd>Skip</dd><dt>{keys("D")}</dt><dd>Mark done</dd><dt>{keys("←")}</dt><dd>Back</dd></dl></div>
</div>
''', 'Hands on the keys, sorting goes faster.'))

S.append(section('mobile', 'all', 'Phones & dark mode', f'''
<div class="pair">
{fig("phone", [("check", "Tick boxes", "are always visible on touch screens."), ("bar", "The selection bar", "scrolls sideways: Move to, Nest under, Color and more."), ("filters", "Search & filter", "opens the filters.")], size="phone", cols=1)}
<div class="stack">
<p>Drag-and-drop depends on the phone’s browser. When it doesn’t work, tick cards and use <b>Move to…</b> or <b>Nest under…</b> in the bar.</p>
{fig("dark", [], caption="HatRack follows your device’s light or dark setting. The ◐ button switches it.", size="mid")}
</div></div>
''', 'Works on a phone; looks right at night.'))

FAQ = [
    ('My tasks are gone.', 'Check you’re in the same browser, at the same address, and not in a private window. The home-screen app and the browser tab keep separate data. If you have a backup, Configure → Data → Restore brings everything back.'),
    ('Todoist says the file has too many tasks.', 'Todoist takes up to 300 tasks per project. In Export, turn on “One file per section” and import each file into its own project.'),
    ('A note went to the wrong group.', 'A keyword matched. Edit the keywords in Configure → Groups & levels, or untick “Auto-sort” in Import for that paste.'),
    ('I can’t nest a card there.', 'Subtasks go three levels deep, and a task can’t go inside its own subtask. The drop target stays un-highlighted when nesting isn’t possible.'),
    ('Where are attached files kept?', 'In this browser’s own storage. Tick “Include stored attachment files” when you back up to carry them to another device. Links work everywhere.'),
    ('Can my team work on one shared board?', 'Not yet — each person has their own rack. Share a setup template so everyone uses the same groups, and share exports for the tasks themselves.'),
    ('Does anything get uploaded?', 'No. HatRack has no server. Data leaves your browser only when you download a backup or an export.'),
]
S.append(section('faq', 'all', 'Questions', '<div class="faq">' + ''.join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in FAQ) + '</div>'))

S.append(section('whats-new', 'all', 'What’s new in 1.1', '''
<ul class="new">
<li><b>Subtasks.</b> Drag a card onto another card — on the board or in the outline — to nest it. Up to three levels, each with its own dates and status.</li>
<li><b>Drag in the outline.</b> Move tasks between groups, reorder them, nest them, and move subnotes from task to task.</li>
<li><b>Three-line previews.</b> Long titles and notes fold away; expand a card to read everything.</li>
<li><b>Card colors</b> from the editor, the right-click menu or the selection bar.</li>
<li><b>Right-click menu</b> on cards: color, add subtask, nest, move, duplicate.</li>
<li><b>Setup templates</b> and smarter merging, so a team can share one structure.</li>
<li><b>Home-screen icon</b> and install support for phones.</li>
<li><b>This guide,</b> built into HatRack’s Help menu, with “How this works” links in every dialog.</li>
</ul>'''))

# ---------------------------------------------------------------- page
CSS = r'''
:root{
  --bg:#EDF0F3; --surface:#FFFFFF; --chip:#EEF1F4; --panel:#E2E8EE;
  --ink:#17202B; --ink2:#3F4A59; --muted:#647083; --line:#CDD5DE; --line2:#E2E7ED;
  --accent:#1E6B52; --accent-soft:#D6EBE2; --accent-ink:#FFFFFF;
  --pin:#D9961A; --pin-ink:#1B1406; --pin-soft:#FBEBC8;
  --admin:#2F5D9E; --admin-soft:#DCE8F8; --warn-soft:#FBEBC8;
  --shadow:0 1px 0 rgba(23,32,43,.05),0 2px 8px rgba(23,32,43,.08);
  --font-ui:"Atkinson Hyperlegible",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --font-display:"Bricolage Grotesque","Atkinson Hyperlegible",system-ui,sans-serif;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --bg:#10151B; --surface:#1A222B; --chip:#25303B; --panel:#212B35;
  --ink:#E5EAF0; --ink2:#B9C3CF; --muted:#8E9AAA; --line:#2E3A47; --line2:#26313C;
  --accent:#47B08A; --accent-soft:#173A2E; --accent-ink:#0B1A14;
  --pin:#E7B040; --pin-ink:#1B1406; --pin-soft:#3A2F14;
  --admin:#7FA8E6; --admin-soft:#1A2B40; --warn-soft:#3A2F14;
  --shadow:0 1px 0 rgba(0,0,0,.3),0 2px 10px rgba(0,0,0,.35); color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#10151B; --surface:#1A222B; --chip:#25303B; --panel:#212B35;
  --ink:#E5EAF0; --ink2:#B9C3CF; --muted:#8E9AAA; --line:#2E3A47; --line2:#26313C;
  --accent:#47B08A; --accent-soft:#173A2E; --accent-ink:#0B1A14;
  --pin:#E7B040; --pin-ink:#1B1406; --pin-soft:#3A2F14;
  --admin:#7FA8E6; --admin-soft:#1A2B40; --warn-soft:#3A2F14;
  --shadow:0 1px 0 rgba(0,0,0,.3),0 2px 10px rgba(0,0,0,.35); color-scheme:dark}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:76px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 var(--font-ui);-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-underline-offset:2px}
code{font:.88em/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--chip);border-radius:5px;padding:1px 5px}
kbd{display:inline-block;font:600 12.5px/1 var(--font-ui);padding:4px 7px 3px;border:1px solid var(--line);border-bottom-width:2px;border-radius:6px;background:var(--surface);color:var(--ink);margin:0 1px;white-space:nowrap}
h1,h2,h3,h4{font-family:var(--font-display);letter-spacing:-.015em;text-wrap:balance;margin:0}
.muted{color:var(--muted)} .sm{font-size:14px}
/* header */
.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:21;background:var(--surface)}
.top-in{max-width:1280px;margin:0 auto;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding-block:10px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.brand{display:flex;align-items:center;gap:8px;font:700 19px/1 var(--font-display);color:var(--ink);text-decoration:none}
.brand small{font:400 15px var(--font-ui);color:var(--muted);margin-left:2px}
.seg{display:inline-flex;background:var(--chip);border-radius:10px;padding:3px;gap:2px;margin-left:auto}
.seg button{border:0;background:transparent;font:inherit;font-size:14px;padding:6px 12px;border-radius:8px;color:var(--ink2);cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--surface);color:var(--ink);font-weight:700;box-shadow:var(--shadow)}
.open-app{font-size:14px;font-weight:700;text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:6px 12px;background:var(--surface);color:var(--ink)}
body.embed .open-app{display:none}
/* layout */
.wrap{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:220px minmax(0,1fr);gap:44px;padding-block:28px 80px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
nav.toc{position:sticky;top:84px;align-self:start;max-height:calc(100vh - 100px);overflow:auto;font-size:14.5px}
nav.toc ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px}
nav.toc a{display:flex;gap:8px;align-items:center;padding:5px 10px;border-radius:7px;color:var(--ink2);text-decoration:none}
nav.toc a:hover{background:var(--chip);color:var(--ink)}
nav.toc a.on{background:var(--surface);color:var(--ink);font-weight:700;box-shadow:var(--shadow)}
nav.toc .dot{width:7px;height:7px;border-radius:50%;background:var(--line);flex:none}
nav.toc [data-role="user"] .dot{background:var(--accent)} nav.toc [data-role="admin"] .dot{background:var(--admin)}
nav.toc .grp{font-size:12.5px;color:var(--muted);padding:12px 10px 3px}
.toc-m{display:none}
main{min-width:0}
.hero{margin:0 0 30px}
.hero h1{font-size:clamp(34px,5vw,52px);line-height:1.05;margin:0 0 12px}
.hero p{font-size:18.5px;color:var(--ink2);max-width:62ch;margin:0 0 16px}
.jump{display:flex;flex-wrap:wrap;gap:8px}
.jump a{font-size:14px;font-weight:700;text-decoration:none;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:6px 13px;color:var(--ink)}
.jump a:hover{border-color:var(--accent)}
/* sections */
.sec{padding:34px 0 10px;border-top:1px solid var(--line)}
.sec-h{margin-bottom:16px}
.sec h2{font-size:clamp(26px,3.2vw,34px);line-height:1.1;margin:6px 0 6px}
.sec h3{font-size:20px;margin:30px 0 12px}
.sec h4{font-size:16px;margin:0 0 8px}
.lede{font-size:17.5px;color:var(--ink2);margin:0;max-width:62ch}
.sec>p,.stack>p,.sec .note,.tip-line{max-width:70ch}
.role-tag{display:inline-block;font-size:12.5px;font-weight:700;border-radius:999px;padding:2px 10px}
.role-tag.user{background:var(--accent-soft);color:var(--accent)} .role-tag.admin{background:var(--admin-soft);color:var(--admin)} .role-tag.all{background:var(--chip);color:var(--ink2)}
body[data-role="user"] [data-role="admin"],body[data-role="admin"] [data-role="user"]{display:none!important}
/* annotated screenshot */
.shot{margin:18px 0 26px}
.frame{position:relative;width:100%;border-radius:12px;overflow:hidden;box-shadow:0 0 0 1px var(--line),var(--shadow);background:var(--surface);cursor:zoom-in}
.frame img{display:block;width:100%;height:auto}
.pin{position:absolute;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;border:2px solid #fff;background:var(--pin);color:var(--pin-ink);font:700 12.5px/1 var(--font-ui);display:grid;place-items:center;padding:0;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.35);transition:transform .12s;z-index:2}
.pin.on,.pin:hover,.pin:focus-visible{transform:translate(-50%,-50%) scale(1.25);z-index:3;outline:none}
.hlbox{position:absolute;border:2.5px solid var(--pin);border-radius:6px;background:rgba(217,150,26,.12);opacity:0;transition:opacity .12s;pointer-events:none;z-index:1}
.hlbox.on{opacity:1}
.shot figcaption{font-size:14px;color:var(--muted);margin:9px 2px 0}
.legend{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:7px 22px;font-size:15px}
.legend.c2{grid-template-columns:repeat(2,minmax(0,1fr))}
.legend li{display:flex;gap:9px;align-items:flex-start;padding:3px 6px;border-radius:8px;cursor:default}
.legend li.on{background:var(--pin-soft)}
.legend .num{flex:none;width:22px;height:22px;border-radius:50%;background:var(--pin);color:var(--pin-ink);font:700 12px/22px var(--font-ui);text-align:center;margin-top:1px}
.legend b{font-weight:700}
.shot.mid .frame{max-width:min(100%,640px)!important}
.shot.tiny{margin:0}
.shot.phone .frame{max-width:300px!important}
/* filmstrip */
.strip{list-style:none;margin:8px 0 18px;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.strip li{min-width:0}
.strip img{display:block;width:100%;height:auto;border-radius:10px;box-shadow:0 0 0 1px var(--line),var(--shadow);background:var(--surface);cursor:zoom-in}
.strip p{font-size:14.5px;margin:9px 2px 0;display:flex;gap:8px;align-items:flex-start;color:var(--ink2)}
.step{flex:none;width:22px;height:22px;border-radius:6px;background:var(--accent);color:var(--accent-ink);font:700 12.5px/22px var(--font-ui);text-align:center}
/* layout helpers */
.pair{display:grid;grid-template-columns:minmax(0,auto) minmax(0,1fr);gap:28px;align-items:start;margin:10px 0}
.pair.wide-left{grid-template-columns:minmax(0,520px) minmax(0,1fr)}
.pair .shot{margin:0}
.stack{display:flex;flex-direction:column;gap:14px;min-width:0}
.duo{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap}
.cols2{display:grid;grid-template-columns:1fr 1fr;gap:28px}
/* roles & loop */
.roles{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.role{background:var(--surface);border-radius:14px;padding:18px 20px;box-shadow:var(--shadow);border-top:5px solid var(--accent)}
.role.admin{border-top-color:var(--admin)}
.role h4{font-size:19px;margin:0}
.role p{margin:2px 0 10px;font-size:14px}
.role ul{margin:0 0 12px;padding-left:20px;display:flex;flex-direction:column;gap:4px}
.go{font-weight:700;font-size:14.5px}
.note{background:var(--surface);border-left:4px solid var(--pin);border-radius:0 10px 10px 0;padding:10px 14px;font-size:15px;margin:16px 0}
.warn{background:var(--warn-soft);border-radius:10px;padding:12px 16px;font-size:15px;margin:18px 0}
.loop{list-style:none;counter-reset:s;margin:0 0 18px;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0}
.loop li{counter-increment:s;position:relative;background:var(--surface);padding:14px 14px 14px 16px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:4px}
.loop li:first-child{border-radius:12px 0 0 12px} .loop li:last-child{border-radius:0 12px 12px 0}
.loop li+li{border-left:1px dashed var(--line)}
.loop li::before{content:counter(s);width:24px;height:24px;border-radius:50%;background:var(--accent);color:var(--accent-ink);font:700 12.5px/24px var(--font-ui);text-align:center;margin-bottom:4px}
.loop b{font-family:var(--font-display);font-size:16.5px}
.loop span{font-size:14px;color:var(--ink2)}
/* concept tree */
.tree{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:6px 0 10px}
.tree-col{background:var(--surface);border-radius:14px;padding:18px;box-shadow:var(--shadow)}
.lvl,.node{border-radius:10px;padding:10px 12px;margin-top:8px;display:flex;flex-direction:column;gap:2px;border:1.5px solid var(--line)}
.lvl b,.node b{font-family:var(--font-display);font-size:16px}
.lvl small,.node small{color:var(--muted);font-size:13px}
.lname{font-size:12px;font-weight:700;color:var(--accent)}
.lvl.l1{border-color:var(--accent);border-left-width:6px}
.lvl .lvl{margin-left:14px}
.node.task{border-left:6px solid var(--accent)}
.node.sub{margin-left:14px;background:var(--panel);border-color:transparent}
.node.note{margin-left:14px;border-style:dashed;font-size:15px}
/* tokens */
.tokens{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 18px;background:var(--surface);padding:14px;border-radius:12px;box-shadow:var(--shadow)}
.tok{display:flex;flex-direction:column;gap:4px;max-width:220px}
.tok code{font-size:15px;padding:4px 8px;border-radius:7px;background:var(--chip);align-self:flex-start}
.tok small{font-size:12.5px;color:var(--muted);line-height:1.3}
.tok.at code{background:var(--accent-soft);color:var(--accent)} .tok.bang code{background:#FCE3E0;color:#9F2617} .tok.caret code{background:var(--pin-soft);color:#7A4E07}
.tok.tilde code{background:var(--admin-soft);color:var(--admin)} .tok.hash code{background:#E9E1F7;color:#6B3496}
:root[data-theme="dark"] .tok.bang code{background:#3B2321;color:#F3A397} :root[data-theme="dark"] .tok.caret code{color:#F1C66E} :root[data-theme="dark"] .tok.hash code{background:#2A2240;color:#C9A6F0}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .tok.bang code{background:#3B2321;color:#F3A397}:root:not([data-theme="light"]) .tok.caret code{color:#F1C66E}:root:not([data-theme="light"]) .tok.hash code{background:#2A2240;color:#C9A6F0}}
/* tables & lists */
.tbl{width:100%;border-collapse:collapse;font-size:15px;background:var(--surface);border-radius:12px;overflow:hidden;box-shadow:var(--shadow);margin:10px 0 16px;display:block;overflow-x:auto}
.tbl thead,.tbl tbody{display:table;width:100%;border-collapse:collapse}
.tbl th{text-align:left;font-size:13.5px;color:var(--muted);font-weight:700;padding:10px 14px;border-bottom:1px solid var(--line)}
.tbl td{padding:9px 14px;border-bottom:1px solid var(--line2);vertical-align:top}
.tbl tr:last-child td{border-bottom:0}
.tbl td:first-child{min-width:150px}
.compare .y{color:var(--accent);font-weight:700} .compare .n{color:var(--muted)}
.tips,.rules,.new{padding-left:20px;margin:8px 0 12px;display:flex;flex-direction:column;gap:7px;max-width:72ch}
.rules{background:var(--surface);border-radius:12px;padding:14px 18px 14px 34px;box-shadow:var(--shadow)}
.tip-line{font-size:15px;color:var(--ink2);border-left:3px solid var(--accent);padding-left:12px}
.checklist{counter-reset:c;list-style:none;padding:0;margin:10px 0;display:flex;flex-direction:column;gap:8px;max-width:72ch}
.checklist li{counter-increment:c;display:flex;gap:10px;align-items:baseline}
.checklist li::before{content:counter(c);flex:none;width:22px;height:22px;border-radius:6px;background:var(--admin);color:#fff;font:700 12px/22px var(--font-ui);text-align:center;transform:translateY(-1px)}
/* zones diagram */
.zones{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:28px;align-items:start;margin:4px 0 8px}
.zone-col{background:var(--panel);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px}
.z-colhead{background:var(--surface);border-radius:9px;border-top:4px solid var(--accent);padding:9px 12px;font:700 15px var(--font-display)}
.z-card{background:var(--surface);border-radius:9px;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow)}
.z-band{font-size:13px;font-weight:700;padding:7px 12px}
.z-band.top,.z-band.bot{background:color-mix(in srgb,var(--accent) 14%,var(--surface));color:var(--accent);border-style:solid;border-color:var(--accent);border-width:3px 0 0}
.z-band.bot{border-width:0 0 3px}
.z-band.mid{padding:20px 12px;background:var(--accent-soft);color:var(--accent);outline:2px solid var(--accent);outline-offset:-2px;text-align:center}
.z-gap{border:2px dashed var(--accent);border-radius:9px;padding:16px 12px;font-size:13px;font-weight:700;color:var(--accent);text-align:center;background:color-mix(in srgb,var(--accent) 7%,transparent)}
.z-notes{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:9px;font-size:15.5px}
/* data flows */
.flows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;min-width:0}
.flow{background:var(--surface);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow)}
.fl{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:14px;margin:6px 0}
.fl .box{background:var(--chip);border-radius:8px;padding:6px 10px;font-weight:700}
.fl .box.file{background:var(--pin-soft);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}
.fl .box.admin{background:var(--admin-soft);color:var(--admin)}
.fl .arr{color:var(--muted);font-size:13px}
.fl .arr::after{content:" →"}
.files{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:15px}
.files li{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.files span{color:var(--muted);font-size:14px}
.install{display:flex;gap:18px;align-items:center;background:var(--surface);border-radius:14px;padding:16px 18px;box-shadow:var(--shadow);margin:20px 0}
.install img{border-radius:20px;flex:none;box-shadow:var(--shadow)}
.install h3{margin:0 0 6px}
.install p{margin:4px 0}
/* keys & faq */
.keys{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.keys>div{background:var(--surface);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow)}
.keys dl{display:grid;grid-template-columns:auto 1fr;gap:7px 12px;margin:0;font-size:14.5px;align-items:center}
.keys dt{white-space:nowrap} .keys dd{margin:0;color:var(--ink2)}
.faq{display:flex;flex-direction:column;gap:8px;max-width:76ch}
.faq details{background:var(--surface);border-radius:10px;padding:11px 16px;box-shadow:var(--shadow)}
.faq summary{cursor:pointer;font-weight:700}
.faq p{margin:8px 0 2px;color:var(--ink2)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
/* zoom */
.zoom{position:fixed;inset:0;z-index:50;background:rgba(10,14,20,.86);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:max(20px,env(safe-area-inset-top,0px)) 16px 20px;cursor:zoom-out}
.zoom img{max-width:min(100%,1600px);height:auto;border-radius:10px;background:#fff}
/* responsive */
@media (max-width:1000px){
  .wrap{grid-template-columns:1fr;gap:0}
  nav.toc{display:none}
  .toc-m{display:block;margin:0 0 18px}
  .toc-m summary{cursor:pointer;font-weight:700;background:var(--surface);border-radius:10px;padding:10px 14px;box-shadow:var(--shadow)}
  .toc-m ol{list-style:none;padding:8px 4px;margin:0;columns:2;font-size:15px}
  .toc-m a{display:block;padding:4px 8px;text-decoration:none;color:var(--ink2)}
  .pair,.pair.wide-left,.zones{grid-template-columns:1fr}
  .loop{grid-template-columns:1fr}
  .loop li,.loop li:first-child,.loop li:last-child{border-radius:0}
  .loop li:first-child{border-radius:12px 12px 0 0} .loop li:last-child{border-radius:0 0 12px 12px}
  .loop li+li{border-left:0;border-top:1px dashed var(--line)}
}
@media (max-width:720px){
  .legend.c2,.roles,.tree,.cols2,.keys,.strip,.flows{grid-template-columns:1fr}
  .pin{width:20px;height:20px;font-size:11px;border-width:1.5px}
  .seg{margin-left:0;order:3;width:100%}
  .seg button{flex:1}
  .top-in{gap:10px}
  .toc-m ol{columns:1}
  .install{flex-direction:column;align-items:flex-start}
}
'''

JS = r'''
(function () {
  var q = new URLSearchParams(location.search);
  var root = document.documentElement;
  if (q.get('theme') === 'dark' || q.get('theme') === 'light') root.setAttribute('data-theme', q.get('theme'));
  if (q.get('embed')) document.body.classList.add('embed');
  // role filter
  var KEY = 'hatrack.guide.role';
  function setRole(r, keep) {
    document.body.setAttribute('data-role', r);
    document.querySelectorAll('[data-setrole]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-setrole') === r)); });
    if (!keep) { try { localStorage.setItem(KEY, r); } catch (e) {} }
  }
  var saved = 'all'; try { saved = localStorage.getItem(KEY) || 'all'; } catch (e) {}
  setRole(q.get('role') || saved, true);
  document.querySelectorAll('[data-setrole]').forEach(function (b) { b.addEventListener('click', function () { setRole(b.getAttribute('data-setrole')); }); });
  // a deep link into a hidden section shows everything
  function revealHash() {
    var id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
    var el = document.getElementById(id); if (!el) return;
    var sec = el.closest('[data-role]');
    if (sec && sec.offsetParent === null) setRole('all', true);
    setTimeout(function () { el.scrollIntoView({ block: 'start' }); }, 30);
  }
  window.addEventListener('hashchange', revealHash); revealHash();
  // pins <-> legend
  document.querySelectorAll('.shot').forEach(function (f) {
    function on(n, v) { f.querySelectorAll('[data-n="' + n + '"]').forEach(function (x) { x.classList.toggle('on', v); }); }
    f.querySelectorAll('[data-n]').forEach(function (x) {
      var n = x.getAttribute('data-n');
      x.addEventListener('mouseenter', function () { on(n, true); });
      x.addEventListener('mouseleave', function () { on(n, false); });
      x.addEventListener('focus', function () { on(n, true); });
      x.addEventListener('blur', function () { on(n, false); });
    });
    f.querySelectorAll('.pin').forEach(function (p) {
      p.addEventListener('click', function (ev) {
        ev.stopPropagation();
        var n = p.getAttribute('data-n'); var li = f.querySelector('.legend li[data-n="' + n + '"]');
        f.querySelectorAll('.on').forEach(function (x) { x.classList.remove('on'); }); on(n, true);
        if (li && li.getBoundingClientRect().top > innerHeight - 40) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    });
  });
  // click a screenshot to see it full size
  function zoom(src) {
    var z = document.createElement('div'); z.className = 'zoom'; z.setAttribute('role', 'dialog'); z.setAttribute('aria-label', 'Full-size screenshot');
    var im = document.createElement('img'); im.src = src; im.alt = ''; z.appendChild(im);
    function close() { z.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    z.addEventListener('click', close); document.addEventListener('keydown', esc); document.body.appendChild(z);
  }
  document.querySelectorAll('.frame img, .strip img').forEach(function (im) { im.addEventListener('click', function () { zoom(im.currentSrc || im.src); }); });
  // highlight the section in view
  var links = {}; document.querySelectorAll('nav.toc a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting && links[en.target.id]) { Object.keys(links).forEach(function (k) { links[k].classList.remove('on'); }); links[en.target.id].classList.add('on'); } });
    }, { rootMargin: '-80px 0px -70% 0px' });
    document.querySelectorAll('section.sec').forEach(function (s) { io.observe(s); });
  }
})();
'''

LOGO = '''<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><rect x="2" y="4" width="28" height="3" rx="1.5" fill="var(--muted)"/><path d="M16 7v4" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/><path d="M8 22c0-6 3.6-9.5 8-9.5s8 3.5 8 9.5z" fill="var(--accent)"/><ellipse cx="16" cy="23" rx="12.5" ry="3.4" fill="var(--accent)"/><path d="M8.4 19.4h15.2" stroke="var(--pin)" stroke-width="2.2"/></svg>'''

def toc_html():
    out, last = [], None
    labels = {'all': None, 'user': 'Daily use', 'admin': 'Setting up'}
    for id_, role, t in TOC:
        grp = 'user' if role == 'user' else 'admin' if role == 'admin' else ('end' if id_ in ('keys', 'mobile', 'faq', 'whats-new') else 'start')
        if grp != last:
            head = {'start': 'Start here', 'user': 'Daily use', 'admin': 'Setting up', 'end': 'Reference'}[grp]
            out.append(f'<li class="grp" data-role="{"all" if grp in ("start", "end") else grp}">{head}</li>')
            last = grp
        out.append(f'<li data-role="{role}"><a href="#{id_}"><span class="dot"></span>{t}</a></li>')
    return ''.join(out)

def body(standalone):
    return f'''<header class="top"><div class="top-in">
  <a class="brand" href="#start">{LOGO}HatRack <small>guide</small></a>
  <div class="seg" role="group" aria-label="Show sections for">
    <button type="button" data-setrole="all" aria-pressed="true">Everything</button>
    <button type="button" data-setrole="user" aria-pressed="false">Daily use</button>
    <button type="button" data-setrole="admin" aria-pressed="false">Setting up</button>
  </div>
  {'<a class="open-app" href="index.html">Open HatRack</a>' if standalone else ''}
</div></header>
<div class="wrap">
<nav class="toc" aria-label="Guide sections"><ol>{toc_html()}</ol></nav>
<main>
<div class="hero">
  <h1>How to use HatRack</h1>
  <p>Every screen, menu and setting, shown on the real thing. Choose <b>Daily use</b> to learn capturing, sorting and exporting, or <b>Setting up</b> for groups, fields, backups and putting HatRack online.</p>
  <div class="jump"><a href="#start">The one-minute tour</a><a href="#board">Drag &amp; nest</a><a href="#import">Import a list</a><a href="#export">Export</a><a href="#admin">Admin setup</a></div>
</div>
<details class="toc-m"><summary>All sections</summary><ol>{toc_html()}</ol></details>
{''.join(S)}
<p class="muted sm" style="margin-top:40px">HatRack 1.1 · Screens show the sample rack (Configure → Data → Add the sample rack).</p>
</main></div>'''

FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&display=swap">'

full = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>HatRack Guide</title><meta name="description" content="Illustrated guide to HatRack: capturing, importing, sorting, nesting subtasks, exporting, and setting up groups, fields and backups.">
<link rel="icon" href="apple-touch-icon.png"><link rel="apple-touch-icon" href="apple-touch-icon.png">{FONTS}
<style>{CSS}</style></head>
<body data-role="all">{body(True)}<script>{JS}</script></body></html>'''
(ROOT / 'guide.html').write_text(full)

frag = f'''<title>HatRack Guide</title>
<meta name="claude:viewport-fit-sides" content="cover">
{FONTS}
<style>{CSS}</style>
{body(False)}
<script>document.body.setAttribute('data-role','all');{JS}</script>'''
(ROOT / 'guide-src' / 'guide-artifact.html').write_text(frag)
print('guide.html', round(len(full) / 1024), 'KB;', 'images', sum(1 for _ in (ROOT / 'guide').glob('*.webp')))
