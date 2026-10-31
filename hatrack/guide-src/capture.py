#!/usr/bin/env python3
"""Capture annotated screenshots of HatRack for the visual guide.

Writes guide/<name>.webp plus guide-src/shots.json with callout positions (percent of the image).
Run after `python3 build.py`. Optional argument: a folder with @fontsource packages, for machines without internet.
"""
import base64, json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
APP = (ROOT / 'index.html').as_uri()
OUT = ROOT / 'guide'
TMP = ROOT / 'guide-src' / 'raw'
FONTS = Path(sys.argv[1]) if len(sys.argv) > 1 else None
OUT.mkdir(exist_ok=True); TMP.mkdir(parents=True, exist_ok=True)

def font_css():
    if not FONTS: return ''
    faces = [('Atkinson Hyperlegible', 400, 'fontsource-atkinson-hyperlegible-5.3.0/package/files/atkinson-hyperlegible-latin-400-normal.woff2'),
             ('Atkinson Hyperlegible', 700, 'fontsource-atkinson-hyperlegible-5.3.0/package/files/atkinson-hyperlegible-latin-700-normal.woff2'),
             ('Bricolage Grotesque', 600, 'fontsource-bricolage-grotesque-5.3.0/package/files/bricolage-grotesque-latin-600-normal.woff2'),
             ('Bricolage Grotesque', 700, 'fontsource-bricolage-grotesque-5.3.0/package/files/bricolage-grotesque-latin-700-normal.woff2')]
    css = ''
    for fam, w, rel in faces:
        b64 = base64.b64encode((FONTS / rel).read_bytes()).decode()
        css += f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;font-display:block;src:url(data:font/woff2;base64,{b64}) format('woff2')}}\n"
    return css
FONT_CSS = font_css()

MANIFEST = {}
ANCH = {'tl': (0, 0), 't': (.5, 0), 'tr': (1, 0), 'r': (1, .5), 'br': (1, 1), 'b': (.5, 1), 'bl': (0, 1), 'l': (0, .5), 'c': (.5, .5)}

class Shooter:
    def __init__(self, pw):
        self.b = pw.chromium.launch()
    def fresh(self, w=1440, h=900, sample=True, dark=False, mobile=False, dsf=2):
        ctx = self.b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dsf, is_mobile=mobile, has_touch=mobile,
                                 color_scheme='dark' if dark else 'light')
        if FONT_CSS:  # offline: serve the fonts from a local @fontsource download instead of Google Fonts
            ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='text/css', body=FONT_CSS))
            ctx.route('https://fonts.gstatic.com/**', lambda r: r.abort())
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: print('  PAGE ERROR', e))
        pg.goto(APP)
        pg.evaluate('() => document.fonts.ready')
        if sample:
            pg.click('[data-act=sample]')
        pg.wait_for_timeout(250)
        self.quiet(pg)
        return pg
    @staticmethod
    def quiet(pg):
        pg.evaluate("() => document.querySelectorAll('.toast').forEach(t => t.remove())")

    def shot(self, pg, name, clip=None, callouts=(), pad=0, frame=None):
        """clip: None (viewport) | selector | dict; callouts: [(key, selector, anchor)]"""
        self.quiet(pg); pg.wait_for_timeout(120)
        vp = pg.viewport_size
        if clip is None: c = {'x': 0, 'y': 0, 'width': vp['width'], 'height': vp['height']}
        elif isinstance(clip, str): c = pg.locator(clip).first.bounding_box()
        elif isinstance(clip, (list, tuple)):
            bs = [pg.locator(s).first.bounding_box() for s in clip]
            x0 = min(b['x'] for b in bs); y0 = min(b['y'] for b in bs); x1 = max(b['x'] + b['width'] for b in bs); y1 = max(b['y'] + b['height'] for b in bs)
            c = {'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0}
        else: c = dict(clip)
        x0 = max(0, c['x'] - pad); y0 = max(0, c['y'] - pad)
        x1 = min(vp['width'], c['x'] + c['width'] + pad); y1 = min(vp['height'], c['y'] + c['height'] + pad)
        c = {'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0}
        pins = []
        for i, (key, sel, anchor) in enumerate(callouts):
            loc = pg.locator(sel).first
            if not loc.count():
                print(f'  ! {name}: callout {key} not found ({sel})'); continue
            bb = loc.bounding_box()
            if not bb: print(f'  ! {name}: callout {key} has no box'); continue
            ax, ay = ANCH[anchor]
            px = (bb['x'] + bb['width'] * ax - c['x']) / c['width'] * 100
            py = (bb['y'] + bb['height'] * ay - c['y']) / c['height'] * 100
            box = [(bb['x'] - c['x']) / c['width'] * 100, (bb['y'] - c['y']) / c['height'] * 100, bb['width'] / c['width'] * 100, bb['height'] / c['height'] * 100]
            pins.append({'key': key, 'x': round(min(98.5, max(1.5, px)), 2), 'y': round(min(97.5, max(2.5, py)), 2), 'box': [round(v, 2) for v in box]})
        raw = TMP / f'{name}.png'
        pg.screenshot(path=str(raw), clip=c)
        im = Image.open(raw).convert('RGB')
        im.save(OUT / f'{name}.webp', 'WEBP', quality=80, method=6)
        MANIFEST[name] = {'w': im.width, 'h': im.height, 'css_w': round(c['width']), 'pins': pins}
        print(f'  {name}: {im.width}x{im.height}, {len(pins)} pins')

    def ghost(self, pg, src_sel, x, y):
        """fake the drag image a browser would show, for still frames"""
        pg.locator(src_sel).first.evaluate("""(src, [x, y]) => {
          const r = src.getBoundingClientRect();
          const g = src.cloneNode(true); g.classList.remove('is-dragging'); g.id = 'fake-ghost';
          Object.assign(g.style, { position: 'fixed', left: (x - 40) + 'px', top: (y - 18) + 'px', width: r.width + 'px', margin: 0, zIndex: 999,
            transform: 'rotate(-2.5deg)', opacity: '1', background: 'var(--surface)', boxShadow: '0 16px 36px rgba(23,32,43,.28)', pointerEvents: 'none' });
          document.body.appendChild(g);
          const cur = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); cur.setAttribute('viewBox', '0 0 24 24'); cur.id = 'fake-cursor';
          cur.innerHTML = '<path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.6L4 20z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>';
          Object.assign(cur.style, { position: 'fixed', left: x + 'px', top: y + 'px', width: '26px', height: '26px', zIndex: 1000, pointerEvents: 'none' });
          document.body.appendChild(cur);
        }""", [x, y])

def mark(pg, sel, color='var(--hl)'):
    pg.locator(sel).first.evaluate("(e, c) => { e.style.outline = '3px solid ' + c; e.style.outlineOffset = '2px'; }", color)

def card(title): return f'.card:has(> .card-title:has-text("{title}"))'

def run():
    with sync_playwright() as pw:
        S = Shooter(pw)
        # ---------- first run ----------
        pg = S.fresh(sample=False, h=760)
        S.shot(pg, 'empty', clip='.empty', pad=40, callouts=[('paste', '[data-act=import]', 'b'), ('setup', '[data-act=setup]', 'b'), ('sample', '[data-act=sample]', 'b'), ('guide', '[data-act=guide]', 'r')])
        pg.context.close()

        # ---------- overview ----------
        pg = S.fresh()
        S.shot(pg, 'overview', callouts=[
            ('views', '#views', 'b'), ('quick', '#quick', 'l'), ('import', '#btn-import', 'b'), ('triage', '#btn-triage', 'b'),
            ('export', '#btn-export', 'b'), ('configure', '#btn-settings', 'b'), ('help', '#btn-help', 'b'),
            ('scope', '.crumbs', 'l'), ('layout', '.toolbar .tb-group >> nth=0', 'b'), ('filters', '.tb-filters', 'b'), ('options', '#tb-opts', 'b'),
            ('inbox', '.col-head.inbox', 'b'), ('colhead', '.col-head:has-text("Northside")', 'b'), ('card', card('Reorder oat milk'), 'r'),
            ('more', card('Recalibrate the main grinder') + ' [data-more]', 'r'), ('color', card('Interview two weekend'), 'r')])
        # quick add, filled in
        pg.fill('#quick', 'Email Greenway about the holiday order @wholesale !high ^fri ~20m #client')
        S.shot(pg, 'quickadd', clip='#quick-form', pad=10)
        pg.context.close()

        # ---------- card anatomy ----------
        pg = S.fresh()
        pg.hover(card('Call Mom'))
        S.shot(pg, 'card-anatomy', clip=card('Call Mom'), pad=18, callouts=[
            ('type', card('Call Mom') + ' .ty', 'l'), ('title', card('Call Mom') + ' .card-title', 'r'), ('path', card('Call Mom') + ' .card-path', 'r'),
            ('priority', card('Call Mom') + ' .pill >> nth=0', 'b'), ('due', card('Call Mom') + ' .pill >> nth=1', 'b'), ('repeat', card('Call Mom') + ' .pill >> nth=2', 'b'),
            ('time', card('Call Mom') + ' .pill >> nth=3', 'b'), ('seen', card('Call Mom') + ' .pill.seen', 'r'), ('check', card('Call Mom') + ' .card-check', 'r'),
            ('stripe', card('Call Mom'), 'l')])
        # long text: collapsed vs expanded
        pg.mouse.move(5, 5); pg.evaluate("() => document.getElementById('view').scrollTo(0, 0)"); pg.wait_for_timeout(100)
        S.shot(pg, 'long-collapsed', clip=card('Look into a POS'), pad=14, callouts=[('clamp', card('Look into a POS') + ' .card-title', 'r'), ('showall', card('Look into a POS') + ' [data-more]', 'r')])
        pg.click(card('Look into a POS') + ' [data-more]'); pg.wait_for_timeout(150)
        S.shot(pg, 'long-expanded', clip=card('Look into a POS'), pad=14, callouts=[('less', card('Look into a POS') + ' [data-more]', 'r')])
        # expanded card with notes, subnotes and subtasks
        pg.evaluate("""() => { const t = D.tasks.find(x => x.title.startsWith('Draft the 2027')); mutate('x', () => { t.subnotes.push({ id: uid('s'), text: 'Send the draft to Dana', done: false, note: '' }); }); }""")
        S.quiet(pg)
        price = card('Draft the 2027 wholesale')
        S.shot(pg, 'card-collapsed', clip=price, pad=14, callouts=[('more', price + ' [data-more]', 'r'), ('tint', price, 'tr')])
        pg.click(price + ' [data-more]'); pg.wait_for_timeout(150)
        S.shot(pg, 'card-expanded', clip=price, pad=14, callouts=[
            ('less', price + ' [data-more]', 'r'), ('notes', price + ' .cb-notes', 'r'), ('subnotes', price + ' .cb-subs', 'r'),
            ('subtask', price + ' .subcard >> nth=0', 'r'), ('done', price + ' .subcard >> nth=0 >> .sc-done', 'l'), ('add', price + ' .add-sub', 'r')])
        pg.context.close()

        # ---------- drag to move (filmstrip) ----------
        def board_clip(pg, cols=2, h=640):
            r0 = pg.locator('.col-head >> nth=0').bounding_box(); r1 = pg.locator(f'.col-head >> nth={cols - 1}').bounding_box()
            return {'x': r0['x'] - 8, 'y': r0['y'] - 8, 'width': r1['x'] + r1['width'] - r0['x'] + 16, 'height': h}
        pg = S.fresh(h=900)
        clip = board_clip(pg)
        src = card('Schedule shifts for Thanksgiving')
        mark(pg, src)
        S.shot(pg, 'move-1', clip=clip)
        pg.locator(src).first.evaluate("""(s) => { s.style.outline = ''; s.classList.add('is-dragging');
            const cell = document.querySelectorAll('.cell')[1]; cell.classList.add('is-over');
            const ph = document.createElement('div'); ph.className = 'drop-ph'; const cards = cell.querySelectorAll(':scope > .card'); cell.insertBefore(ph, cards[2]); }""")
        tb = pg.locator('.cell >> nth=1').locator(':scope > .card >> nth=2').bounding_box()
        S.ghost(pg, src, tb['x'] + 60, tb['y'] - 6)
        S.shot(pg, 'move-2', clip=clip)
        pg.evaluate("() => { document.getElementById('fake-ghost')?.remove(); document.getElementById('fake-cursor')?.remove(); }")
        pg.evaluate("""() => { const t = D.tasks.find(x => x.title.startsWith('Schedule shifts')); const n = D.areas.find(a => a.name.startsWith('Northside'));
            const cell = document.querySelectorAll('.cell')[1]; const before = cell.querySelectorAll(':scope > .card')[2].dataset.id;
            moveTasks([t.id], ['area|' + n.id], before, false, cell); }""")
        S.quiet(pg); mark(pg, src, 'var(--accent)')
        S.shot(pg, 'move-3', clip=clip)
        pg.context.close()

        # ---------- drag onto a card to nest (filmstrip) ----------
        pg = S.fresh(h=1100)
        clip = board_clip(pg, h=900)
        src = card('Look into a POS'); tgt = card('Draft the 2027 wholesale')
        mark(pg, src); mark(pg, tgt, 'var(--accent)')
        S.shot(pg, 'nest-1', clip=clip)
        pg.evaluate("() => document.querySelectorAll('.card').forEach(c => c.style.outline = '')")
        pg.locator(src).first.evaluate("(e) => e.classList.add('is-dragging')")
        pg.locator(tgt).first.evaluate("(t) => { t.classList.add('nest-target'); t.dataset.nestLabel = 'Make it a subtask'; }")
        bb = pg.locator(tgt).bounding_box()
        S.ghost(pg, src, bb['x'] + bb['width'] * .22, bb['y'] + bb['height'] * .42)
        S.shot(pg, 'nest-2', clip=clip)
        pg.evaluate("() => { document.getElementById('fake-ghost')?.remove(); document.getElementById('fake-cursor')?.remove(); }")
        pg.evaluate("""() => { const c = D.tasks.find(x => x.title.startsWith('Look into a POS')); const p = D.tasks.find(x => x.title.startsWith('Draft the 2027')); nestTasks([c.id], p.id, false); }""")
        S.quiet(pg); mark(pg, tgt + ' .subcard:has-text("Look into a POS")', 'var(--accent)')
        S.shot(pg, 'nest-3', clip=clip)
        pg.context.close()

        # ---------- drill down ----------
        pg = S.fresh()
        pg.click('.col-name.drill:has-text("Northside")'); pg.wait_for_timeout(200)
        S.shot(pg, 'drill', clip={'x': 0, 'y': 56, 'width': 1440, 'height': 520}, callouts=[
            ('crumbs', '.crumbs', 'r'), ('notyet', '.col-head.inbox', 'b'), ('sub', '.col-head:has-text("Wholesale")', 'b')])
        pg.context.close()

        # ---------- columns × rows grid ----------
        pg = S.fresh(h=980)
        pg.select_option('#tb-group', 'priority'); pg.select_option('#tb-lanes', 'area'); pg.wait_for_timeout(200)
        S.shot(pg, 'grid', clip={'x': 0, 'y': 56, 'width': 1440, 'height': 900}, callouts=[
            ('cols', '#tb-group', 'b'), ('rows', '#tb-lanes', 'b'), ('colhead', '.col-head >> nth=1', 'b'), ('lane', '.lane-head >> nth=1', 'r'),
            ('cell', '.lane >> nth=1 >> .cell >> nth=1', 'tr')])
        pg.context.close()

        # ---------- selection & bulk ----------
        pg = S.fresh()
        for t in ['Renew the domain', 'Ask Priya', 'Book the HVAC']:
            pg.click(card(t) + ' .card-title', modifiers=['Control'])
        pg.mouse.move(700, 880)
        S.shot(pg, 'selection', callouts=[('sel', '.card.is-sel >> nth=0', 'r'), ('keys', '.col-key >> nth=2', 'b'), ('move', '[data-sb=move]', 't'),
                                          ('nest', '[data-sb=nest]', 't'), ('color', '[data-sb=color]', 't'), ('more', '[data-sb=export]', 't')])
        pg.context.close()

        # ---------- right-click menu ----------
        pg = S.fresh()
        bb = pg.locator(card('Send Vance Logistics')).bounding_box()
        pg.mouse.click(bb['x'] + 120, bb['y'] + 30, button='right'); pg.wait_for_timeout(150)
        m = pg.locator('.menu').bounding_box()
        S.shot(pg, 'context-menu', clip={'x': bb['x'] - 10, 'y': bb['y'] - 10, 'width': m['x'] + m['width'] - bb['x'] + 24, 'height': m['y'] + m['height'] - bb['y'] + 24}, callouts=[
            ('colors', '.menu .sw-row', 'r'), ('add', '.menu button:has-text("Add a subtask")', 'r'), ('nest', '.menu button:has-text("Nest under")', 'r'),
            ('move', '.menu button:has-text("Move to")', 'r'), ('dup', '.menu button:has-text("Duplicate")', 'r')])
        pg.keyboard.press('Escape')
        pg.click('#btn-help'); pg.wait_for_timeout(150)
        S.shot(pg, 'help-menu', clip={'x': 1080, 'y': 0, 'width': 360, 'height': 250})
        pg.context.close()

        # ---------- task editor ----------
        pg = S.fresh(h=1560)
        pg.evaluate("""() => { const t = D.tasks.find(x => x.title.startsWith('Q4 cash-flow')); mutate('x', () => { t.notes = 'Board meeting is the 12th. Keep it to ten slides: cash runway, collections, and the hiring scenario.'; t.attachments.push({ id: uid('at'), kind: 'link', url: 'https://drive.google.com/', name: 'Q3 deck (Google Drive)' }); t.subnotes.push({ id: uid('s'), text: 'Ask for the AR aging report', done: false, note: '' }); }); }""")
        pg.click(card('Q4 cash-flow') + ' .card-title'); pg.wait_for_timeout(250)
        pg.set_viewport_size({'width': 1440, 'height': 700}); pg.wait_for_timeout(150)
        need = pg.evaluate("() => { const d = document.querySelector('#drawer'); return d.querySelector('.drawer-head').offsetHeight + d.querySelector('.drawer-body').scrollHeight + d.querySelector('.drawer-foot').offsetHeight + 4; }")
        pg.set_viewport_size({'width': 1440, 'height': int(need)}); pg.wait_for_timeout(200)
        S.shot(pg, 'editor', clip='#drawer', callouts=[
            ('path', '.drawer-head .path', 'b'), ('title', '#ed-title', 'r'), ('where', '#ed-area', 'r'), ('fields', '.drawer .grid2', 'tr'),
            ('color', '.drawer .swatches', 'r'), ('notes', '#ed-notes', 'r'), ('subtasks', '.st-row >> nth=0', 'r'), ('addsub', '#ed-subtaskadd', 'r'),
            ('subnotes', '#ed-subadd', 'r'), ('atts', '.atts', 'r'), ('foot', '.drawer-foot [data-ed=done]', 't')])
        pg.click('.st-row >> nth=0 >> .st-title'); pg.wait_for_timeout(200)
        S.shot(pg, 'editor-child', clip={'x': 1440 - 500, 'y': 0, 'width': 500, 'height': 190}, callouts=[('parent', '[data-ed=openparent]', 'r')])
        pg.context.close()

        # ---------- import ----------
        pg = S.fresh(h=1000)
        note = ("NORTHSIDE\n- reorder cups and lids !high ^mon\n- fix the leaky sink at the café ~1h\n    - call the plumber\n"
                "Remind me to renew the business license ^nov30 *yearly\nLedgerline:\n- send Harper the Q4 deck ^fri\n- invoice Vance for October\n"
                "idea: loyalty card for wholesale customers\nremind me to renew the business license\nPick up dry cleaning")
        pg.click('#btn-import'); pg.wait_for_timeout(150)
        pg.fill('#imp-text', note); pg.wait_for_timeout(600)
        S.shot(pg, 'import', clip='.modal', callouts=[
            ('text', '#imp-text', 'tl'), ('file', '.imp-filebar .btn', 'r'), ('layout', '#imp-mode', 'r'), ('plain', '#imp-group', 'r'), ('base', '#imp-base', 'r'),
            ('nest', '#imp-nest', 'r'), ('dup', '#imp-dup', 'r'), ('checks', '.imp-checks', 'r'), ('summary', '#imp-sum', 'l'),
            ('auto', '#imp-prev .badge:has-text("auto") >> nth=0', 'r'), ('repeat', '#imp-prev .badge.warn >> nth=0', 'l'), ('go', '#imp-go', 'l'), ('help', '.modal-head .help-link', 'b')])
        pg.context.close()

        # ---------- triage ----------
        pg = S.fresh(h=980)
        pg.keyboard.press('t'); pg.wait_for_timeout(250)
        S.shot(pg, 'triage', clip='.modal', callouts=[
            ('progress', '.tri-progress', 'r'), ('card', '.tri-card', 'r'), ('groups', '.tri-opts >> nth=0 >> .opt >> nth=0', 'tl'), ('key', '.tri-opts >> nth=0 >> .opt .k >> nth=1', 't'),
            ('new', '[data-newarea]', 'r'), ('type', '.tri-row >> nth=1', 'l'), ('due', '.tri-row >> nth=4', 'l'), ('skip', '[data-tri=skip]', 't'),
            ('auto', '#tri-auto', 'l'), ('next', '[data-tri=next]', 'l')])
        pg.context.close()

        # ---------- list, outline, reports ----------
        pg = S.fresh()
        pg.click('#views [data-view=list]'); pg.wait_for_timeout(200)
        S.shot(pg, 'list', callouts=[('sort', '.tbl th >> nth=4', 'b'), ('edit', '[data-set=area] >> nth=0', 'r'), ('child', 'tr:has-text("Pull September") .t-title', 'r'), ('check', '.tbl th >> nth=0', 'b')])
        pg.click('#views [data-view=outline]'); pg.wait_for_timeout(200)
        pg.evaluate("() => document.getElementById('view').scrollTo(0, 330)")
        pg.evaluate("""() => { const row = [...document.querySelectorAll('.ol-row')].find(r => r.textContent.includes('Follow up with Greenway')); row.classList.add('nest-target'); row.dataset.nestLabel = 'Make it a subtask';
            const r2 = [...document.querySelectorAll('.ol-row')].find(r => r.textContent.includes('Interview two weekend')); r2.classList.add('drop-before'); }""")
        S.shot(pg, 'outline', callouts=[('actions', '.outline-actions .btn >> nth=0', 'b'), ('grip', '.ol-row:has-text("Reorder oat milk") .ol-grip', 'l'),
                                        ('heading', '.ol-h:has-text("Wholesale")', 'r'), ('children', '.ol-children >> nth=0', 'l'), ('nest', '.ol-row.nest-target', 'r'), ('before', '.ol-row.drop-before', 'r')])
        pg.click('#views [data-view=reports]'); pg.wait_for_timeout(200)
        S.shot(pg, 'reports', callouts=[('stats', '.stats .stat >> nth=1', 'b'), ('bygroup', '.rp:has-text("Open work by") h3', 'r'), ('overdue', '.rp:has-text("Overdue") h3', 'r'),
                                        ('next', '.rp:has-text("Next 14 days") h3', 'r'), ('keep', '.rp:has-text("keep writing down") h3', 'r')])
        pg.context.close()

        # ---------- export ----------
        pg = S.fresh(h=980)
        pg.keyboard.press('e'); pg.wait_for_timeout(200)
        pg.click('label.fmt:has-text("Todoist CSV")'); pg.check('#ex-split'); pg.wait_for_timeout(200)
        S.shot(pg, 'export', clip='.modal', callouts=[
            ('formats', '.fmt.on', 'tr'), ('scope', '#ex-scope', 'r'), ('sections', '#ex-sec', 'r'), ('done', '#ex-done', 'r'), ('split', '#ex-split', 'l'),
            ('howto', '#ex-help', 'l'), ('preview', '#ex-pre', 'tr'), ('copy', '#ex-copy', 't'), ('download', '#ex-dl', 't')])
        pg.context.close()

        # ---------- Configure (admins) ----------
        pg = S.fresh(h=1700)
        pg.click('#btn-settings'); pg.wait_for_timeout(200)
        S.shot(pg, 'cfg-groups', clip='.settings', callouts=[
            ('nav', '.set-nav', 'r'), ('levels', '[data-lvl="0"]', 'l'), ('color', '#set-pane [data-k=color] >> nth=0', 'b'), ('name', '#set-pane [data-k=name] >> nth=0', 't'),
            ('kw', '#set-pane [data-k=keywords] >> nth=0', 't'), ('count', '#set-pane .cnt >> nth=0', 't'), ('notes', '#set-pane [data-op=notes] >> nth=0', 't'),
            ('order', '#set-pane [data-op=up] >> nth=1', 't'), ('nest', '#set-pane [data-op=in] >> nth=1', 't'), ('add', '#set-pane [data-op=add] >> nth=0', 't'),
            ('del', '#set-pane [data-op=del] >> nth=0', 't'), ('addtop', '[data-add=areas]', 'r'), ('how', '.pane-head .help-link', 'l')])
        pg.set_viewport_size({'width': 1440, 'height': 900})
        pg.click('[data-tab=types]'); pg.wait_for_timeout(150)
        S.shot(pg, 'cfg-types', clip='#set-pane', callouts=[('icon', '#set-pane [data-k=icon] >> nth=1', 't'), ('color', '#set-pane [data-k=color] >> nth=1', 't'),
                                                          ('name', '#set-pane [data-k=name] >> nth=1', 't'), ('kw', '#set-pane [data-k=keywords] >> nth=1', 't')])
        pg.click('[data-tab=statuses]'); pg.wait_for_timeout(150)
        S.shot(pg, 'cfg-statuses', clip='#set-pane', callouts=[('done', '#set-pane .chk >> nth=3', 'r'), ('order', '#set-pane [data-op=up] >> nth=1', 't')])
        pg.click('[data-tab=fields]'); pg.click('[data-add=fields]'); pg.wait_for_timeout(150)
        pg.keyboard.press('Control+a'); pg.keyboard.type('Energy'); pg.keyboard.press('Tab')
        fid = pg.evaluate('() => D.fields[0].id')
        pg.select_option(f'[data-id="{fid}"] [data-k=kind]', 'select'); pg.wait_for_timeout(150)
        pg.fill(f'[data-id="{fid}"] [data-k=options]', 'Deep focus, Quick win, Calls'); pg.keyboard.press('Tab'); pg.wait_for_timeout(150)
        S.shot(pg, 'cfg-fields', clip='#set-pane', callouts=[('kind', f'[data-id="{fid}"] [data-k=kind]', 'b'), ('options', f'[data-id="{fid}"] [data-k=options]', 'b')])
        pg.click('[data-tab=data]'); pg.wait_for_timeout(150)
        S.shot(pg, 'cfg-data', clip='#set-pane', callouts=[('backup', '[data-data=backup]', 'r'), ('template', '[data-data=template]', 'r'),
                                                         ('restore', '#set-pane label.btn:has-text("Restore")', 'r'), ('wipe', '[data-data=wipe]', 'r')])
        # the custom field as board columns
        pg.click('.crumbs button[data-view=board]'); pg.wait_for_timeout(150)
        pg.evaluate(f"""() => {{ const pick = ['Draft the 2027', 'Q4 cash-flow', 'Pull September']; const quick = ['Send Vance', 'School picture', 'Follow up with Greenway']; const calls = ['Call Mom', 'Ask Priya'];
            mutate('x', () => {{ D.tasks.forEach(t => {{ if (pick.some(p => t.title.startsWith(p))) t.custom['{fid}'] = 'Deep focus'; if (quick.some(p => t.title.startsWith(p))) t.custom['{fid}'] = 'Quick win'; if (calls.some(p => t.title.startsWith(p))) t.custom['{fid}'] = 'Calls'; }}); }}); }}""")
        pg.select_option('#tb-group', f'cf:{fid}'); pg.wait_for_timeout(200)
        S.shot(pg, 'field-columns', clip={'x': 0, 'y': 56, 'width': 1440, 'height': 560}, callouts=[('cols', '#tb-group', 'b')])
        pg.context.close()

        # ---------- dark mode & phone ----------
        pg = S.fresh(dark=True)
        S.shot(pg, 'dark', clip={'x': 0, 'y': 0, 'width': 1440, 'height': 700})
        pg.context.close()
        pg = S.fresh(w=390, h=844, mobile=True)
        pg.locator(card('Renew the domain') + ' .card-check').tap(); pg.wait_for_timeout(150)
        S.shot(pg, 'phone', callouts=[('check', card('Renew the domain') + ' .card-check', 'l'), ('bar', '#selbar', 't'), ('filters', '#tb-ftoggle', 'r')])
        pg.context.close()

        (ROOT / 'guide-src' / 'shots.json').write_text(json.dumps(MANIFEST, indent=1))
        S.b.close()

if __name__ == '__main__':
    run()
