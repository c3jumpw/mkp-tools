/**
 * Drives the real Circuit Book pages (built against mock-supabase.mjs) and
 * saves an annotated screenshot of every screen, plus a manifest with each
 * screen's title, the page it belongs to, its numbered legend and the region
 * the tour zooms in on.
 *
 * Callouts are tied to real buttons and labels by role and name, so if the UI
 * changes enough to break one, this run fails instead of shipping a guide that
 * points at the wrong thing.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import * as F from "./fixtures.mjs";

const NOW = new Date("2026-10-30T17:30:00-04:00"); // a Friday: Leg Day is scheduled
const VIEW = { width: 390, height: 844 };
const ACCENT = "#5ab0ff";

/* --- Callouts ------------------------------------------------------------- */

async function boxOf(m) {
  const locs = Array.isArray(m.loc) ? m.loc : [m.loc];
  const boxes = [];
  for (const l of locs) {
    await l.first().waitFor({ state: "visible", timeout: 10000 });
    const b = await l.first().boundingBox();
    if (!b) throw new Error(`Callout ${m.n}: element has no box`);
    boxes.push(b);
  }
  const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.width)), y1 = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

async function annotate(page, items, clamp) {
  await page.evaluate(({ items, clamp, ACCENT }) => {
    document.getElementById("cb-annot")?.remove();
    const layer = document.createElement("div");
    layer.id = "cb-annot";
    layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647";
    for (const b of items) {
      const L = b.x - b.pad, T = b.y - b.pad, R = b.x + b.width + b.pad, B = b.y + b.height + b.pad;
      const ring = document.createElement("div");
      ring.style.cssText = `position:fixed;left:${L}px;top:${T}px;width:${R - L}px;height:${B - T}px;` +
        `border:2px solid ${ACCENT};border-radius:10px;box-shadow:0 0 0 2px rgba(14,17,16,.6)`;
      layer.appendChild(ring);
      // Left and right badges sit fully outside the ring when there is room.
      const spots = {
        l: [L - 15, (T + B) / 2], r: [R + 15, (T + B) / 2], tl: [L, T], tr: [R, T], t: [(L + R) / 2, T],
        b: [(L + R) / 2, B], bl: [L, B], br: [R, B],
      };
      const [x, y] = spots[b.at];
      b.cx = Math.max(clamp.x + 14, Math.min(clamp.x + clamp.w - 14, x));
      b.cy = Math.max(clamp.y + 14, Math.min(clamp.y + clamp.h - 14, y));
    }
    // Numbers go on after every ring, so no ring crosses a number.
    for (const b of items) {
      const dot = document.createElement("div");
      dot.textContent = String(b.n);
      dot.style.cssText = `position:fixed;left:${b.cx - 13}px;top:${b.cy - 13}px;width:26px;height:26px;` +
        `border-radius:50%;background:${ACCENT};color:#0e1110;font:700 14px/26px var(--font-ui),system-ui,sans-serif;` +
        `text-align:center;box-shadow:0 0 0 2.5px #0e1110`;
      layer.appendChild(dot);
    }
    document.body.appendChild(layer);
  }, { items, clamp, ACCENT });
}

/* --- Capture ---------------------------------------------------------------- */

export async function capture({ base, mock, outDir, chromiumPath }) {
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = {};
  const setScenario = (name) =>
    fetch(`${mock}/__scenario`, { method: "POST", body: JSON.stringify({ name }) });

  const browser = await chromium.launch(chromiumPath ? { executablePath: chromiumPath } : {});
  const context = await browser.newContext({
    viewport: VIEW, deviceScaleFactor: 2, timezoneId: "America/New_York", locale: "en-US",
    serviceWorkers: "block", colorScheme: "dark",
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(NOW);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  const settle = async (p, ms = 600) => {
    await p.waitForLoadState("networkidle").catch(() => {});
    await p.waitForTimeout(ms);
  };

  const dialogClip = async (p) => {
    const b = await p.getByRole("dialog").last().boundingBox();
    const y = Math.max(0, Math.floor(b.y - 1));
    return { x: 0, y, width: VIEW.width, height: Math.min(VIEW.height, Math.ceil(b.y + b.height + 1)) - y };
  };

  /**
   * One screenshot. `route` is the app page it shows (for the coverage check);
   * `focus` is the band of the image the tour zooms in on: every callout plus
   * a margin, at least 300px tall, plus anything in `focusAlso` (say, the
   * heading that gives the cropped part its context).
   */
  async function shot(p, name, { title, route, marks, legend, clip, focusAlso = [] }) {
    if (marks.length !== legend.length) throw new Error(`${name}: ${marks.length} callouts, ${legend.length} legend entries`);
    const c = clip ?? { x: 0, y: 0, width: VIEW.width, height: VIEW.height };
    const items = [];
    for (const m of marks) items.push({ ...(await boxOf(m)), n: m.n, at: m.at ?? "l", pad: m.pad ?? 4 });
    await annotate(p, items, { x: c.x, y: c.y, w: c.width, h: c.height });
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(outDir, `${name}.png`), clip: c });
    await p.evaluate(() => document.getElementById("cb-annot")?.remove());

    const extra = [];
    for (const l of focusAlso) extra.push({ ...(await boxOf({ n: "focus", loc: l })), pad: 0 });
    const band = [...items, ...extra];
    let y0 = Math.min(...band.map((b) => b.y - b.pad)) - c.y - 28;
    let y1 = Math.max(...band.map((b) => b.y + b.height + b.pad)) - c.y + 28;
    // Close to the top: start at the top, so the screen's title stays in view.
    if (y0 <= 130) y0 = Math.min(y0, 0);
    if (y1 - y0 < 300) {
      const mid = (y0 + y1) / 2;
      y0 = mid - 150;
      y1 = mid + 150;
    }
    // Slide the band back inside the image rather than shrinking it.
    if (y0 < 0) [y0, y1] = [0, y1 - y0];
    if (y1 > c.height) [y0, y1] = [y0 - (y1 - c.height), c.height];
    y0 = Math.max(0, Math.round(y0));
    y1 = Math.min(c.height, Math.round(y1));
    manifest[name] = {
      title, route, legend,
      width: c.width, height: c.height,
      focus: { y: y0, height: y1 - y0 },
    };
    console.log(`  shot ${name}`);
  }

  /* --- Sign in ------------------------------------------------------------- */
  await setScenario("plain");
  await page.goto(`${base}/today`); // signed out: the app sends you to /login
  await page.waitForURL(/\/login/);
  await settle(page);
  await shot(page, "login", {
    title: "Sign in", route: "/login",
    marks: [
      { n: 1, loc: [page.getByText("Email", { exact: true }), page.getByLabel("Password")], pad: 6 },
      { n: 2, loc: page.getByRole("button", { name: "Sign in" }) },
      { n: 3, loc: page.getByRole("button", { name: "Create an account" }), at: "r" },
    ],
    legend: [
      ["Email and password", "The same pair signs you in on any phone or computer."],
      ["Sign in", "Opens Today."],
      ["Create an account", "Switches the form to sign-up. Passwords need at least 6 characters; then tap Create account."],
    ],
  });
  // Today opens the getting-started tour on a first visit; mark it seen so
  // Today stays put for its screenshots.
  await page.evaluate(() => localStorage.setItem("cb.tour.v1", "seen"));
  await page.getByLabel("Email").fill(F.USER.email);
  await page.getByLabel("Password").fill("demo-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/today");
  await settle(page);

  /* --- Today ------------------------------------------------------------- */
  await page.goto(`${base}/today`);
  await settle(page);
  await shot(page, "today", {
    title: "Today", route: "/today",
    marks: [
      { n: 1, loc: page.locator('a[href="/session/s-push"]') },
      { n: 2, loc: page.locator("li", { hasText: "Leg Day" }).first() },
      { n: 3, loc: [page.getByRole("heading", { name: "Other routines" }), page.locator("section", { hasText: "Other routines" }).locator("ul")] },
      { n: 4, loc: page.getByRole("link", { name: "Guide" }) },
      { n: 5, loc: page.getByRole("navigation", { name: "Sections" }), at: "tl", pad: 0 },
    ],
    legend: [
      ["In progress", "Your most recent unfinished session. Resume opens it on the set you reached; older ones wait in History."],
      ["Scheduled today", "Routines set for this weekday, with total sets and a rough time. Start opens session mode."],
      ["Other routines", "Everything not scheduled today. Start runs one anyway; tap the name to edit it."],
      ["Guide", "Opens the guide and this tour. On Library, Routines and History it sits at the top right of the header."],
      ["Tabs", "Today, Library, Routines and History, on every main screen."],
    ],
  });

  /* --- Sync pill (queued changes, no signal) --------------------------------- */
  {
    const p2 = await context.newPage();
    await p2.clock.setFixedTime(NOW);
    await p2.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "onLine", { get: () => false, configurable: true });
      const op = (id, round) => ({ id, kind: "set_complete", sessionId: "s-push", itemId: "s-push-b5-i0", round, completedAt: new Date().toISOString() });
      localStorage.setItem("cb.outbox.v1", JSON.stringify([op("a", 1), op("b", 2)]));
    });
    await p2.goto(`${base}/today`);
    await settle(p2);
    await shot(p2, "offline", {
      title: "Changes waiting to sync", route: "/today",
      clip: { x: 0, y: 520, width: VIEW.width, height: VIEW.height - 520 },
      marks: [{ n: 1, loc: p2.getByRole("status").locator("span") }],
      legend: [["Sync pill", "Shows on the four main tabs while changes are queued on the phone, and disappears once they reach the server."]],
    });
    await p2.evaluate(() => localStorage.removeItem("cb.outbox.v1"));
    await p2.close();
  }

  /* --- Library and the editor --------------------------------------------- */
  await page.goto(`${base}/library`);
  await settle(page, 900);
  await shot(page, "library", {
    title: "Library", route: "/library",
    marks: [
      { n: 1, loc: page.getByRole("button", { name: "New" }), at: "b" },
      { n: 2, loc: page.getByRole("searchbox", { name: "Search workouts" }) },
      { n: 3, loc: page.locator(".rail").nth(0), pad: 2, at: "r" },
      { n: 4, loc: page.locator(".rail").nth(1), pad: 2, at: "r" },
      { n: 5, loc: page.getByRole("button", { name: /Goblet Squat/ }), pad: 0 },
    ],
    legend: [
      ["New", "Opens a blank editor. The exercise is added when you tap Add to library."],
      ["Search", "Matches names, notes and categories as you type."],
      ["Category chips", "Show one category at a time; All clears the filter."],
      ["Muscle chips", "Show only exercises tagged with that muscle. Tap again to clear."],
      ["Exercise", "Cover photo, target, category and muscles worked. Tap to edit."],
    ],
  });

  await page.getByRole("button", { name: /Goblet Squat/ }).click();
  const editor = page.getByRole("dialog");
  await editor.waitFor();
  await settle(page, 900);
  await shot(page, "editor-top", {
    title: "Workout editor: photos and target", route: "/library",
    clip: await dialogClip(page),
    marks: [
      { n: 1, loc: editor.locator("label", { hasText: "Name" }) },
      { n: 2, loc: editor.locator("ul").first(), pad: 6, at: "b" },
      { n: 3, loc: editor.getByRole("button", { name: "Add another photo" }) },
      { n: 4, loc: [editor.getByLabel("Sets"), editor.getByLabel("Reps")], pad: 6 },
      { n: 5, loc: [editor.getByLabel("Minutes"), editor.getByLabel("Seconds")], pad: 6 },
    ],
    legend: [
      ["Name", "The only field you have to fill in."],
      ["Photos", "Up to six, shown in this order during a session. The arrows reorder, the bin removes, and the first is the cover."],
      ["Add another photo", "Opens your photo library. Photos are shrunk on the phone before they upload."],
      ["Sets × reps", "Reps is the target on the session card and can be words, such as \"8 each side\". Sets is only the starting count when the exercise begins a new block; each block keeps its own."],
      ["Time", "Minutes and seconds for holds and timed drills, instead of reps."],
    ],
  });

  await editor.getByText("Target area", { exact: true }).evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(300);
  await shot(page, "editor-muscles", {
    title: "Workout editor: target area", route: "/library",
    clip: await dialogClip(page),
    marks: [
      { n: 1, loc: [editor.getByRole("group", { name: "front view" }), editor.getByRole("group", { name: "back view" })], pad: 6 },
      { n: 2, loc: [editor.getByText("Upper body", { exact: true }), editor.getByRole("button", { name: "Calves", exact: true })], pad: 6 },
      { n: 3, loc: editor.getByRole("button", { name: "Clear all" }), at: "r" },
    ],
    legend: [
      ["Body map", "Tap a muscle on the front or back figure to tag it. Tagged muscles light up here and on the session card."],
      ["Muscle chips", "The same fifteen muscles as a list, grouped by upper body, core and lower body. Either way works."],
      ["Clear all", "Removes every tag."],
    ],
  });

  await editor.locator(".overflow-y-auto").evaluate((el) => (el.scrollTop = el.scrollHeight));
  await page.waitForTimeout(300);
  await shot(page, "editor-bottom", {
    title: "Workout editor: category, notes and saving", route: "/library",
    clip: await dialogClip(page),
    marks: [
      { n: 1, loc: editor.getByRole("textbox", { name: "Target area notes" }) },
      { n: 2, loc: [editor.getByText("Category", { exact: true }), editor.getByPlaceholder("Or type your own")], pad: 6 },
      { n: 3, loc: editor.locator("label", { hasText: "Notes" }), pad: 6 },
      { n: 4, loc: editor.getByRole("button", { name: "Delete this workout" }), at: "r" },
      { n: 5, loc: editor.getByRole("button", { name: "Save changes" }) },
    ],
    legend: [
      ["Target area note", "Anything more specific about what the move works. It shows on the session card."],
      ["Category", "Tap a suggestion or type your own. Categories become the filter chips in the Library."],
      ["Notes", "Cues or working weight. They show under the set squares during a session."],
      ["Delete this workout", "Asks first. Removes it from the library and every routine, deletes its photos, and drops any block it was alone in. Logged sessions keep their record."],
      ["Save changes", "Nothing changes until you tap this. Close the sheet to discard edits."],
    ],
  });
  await editor.getByRole("button", { name: "Close" }).last().click();

  /* --- Routines ------------------------------------------------------------- */
  await page.goto(`${base}/routines`);
  await settle(page);
  await shot(page, "routines", {
    title: "Routines", route: "/routines",
    marks: [
      { n: 1, loc: page.getByRole("button", { name: "New" }), at: "b" },
      { n: 2, loc: page.getByLabel("Monday, Wednesday, Friday"), pad: 4, at: "r" },
      { n: 3, loc: page.getByText("Not scheduled"), at: "r" },
    ],
    legend: [
      ["New", "Name a routine and choose its days."],
      ["Days", "Lime squares are the days it runs, Sunday first. Tap the routine to open the builder."],
      ["Not scheduled", "A routine with no days. It still appears on Today under Other routines."],
    ],
  });

  await page.getByRole("button", { name: "New" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.waitFor();
  await sheet.getByRole("textbox").first().fill("Core Finisher");
  await sheet.getByRole("button", { name: "Tuesday" }).click();
  await sheet.getByRole("button", { name: "Thursday" }).click();
  await page.waitForTimeout(200);
  await shot(page, "new-routine", {
    title: "New routine", route: "/routines",
    clip: await dialogClip(page),
    marks: [
      { n: 1, loc: sheet.locator("label", { hasText: "Name" }) },
      { n: 2, loc: sheet.getByRole("group", { name: "Days this routine runs" }), pad: 6 },
      { n: 3, loc: sheet.getByRole("button", { name: "Create routine" }) },
    ],
    legend: [
      ["Name", "What you'll see on Today and in History."],
      ["Days", "Tap any number of days. A day can hold more than one routine, and you can change them later."],
      ["Create routine", "Opens the routine builder so you can add blocks."],
    ],
  });
  await sheet.getByRole("button", { name: "Close" }).last().click();

  /* --- Routine builder -------------------------------------------------------- */
  await page.goto(`${base}/routines/r-leg`);
  await settle(page, 900);
  await shot(page, "builder-top", {
    title: "Routine builder", route: "/routines/[id]",
    marks: [
      { n: 1, loc: page.locator("label", { hasText: "Name" }) },
      { n: 2, loc: page.getByRole("group", { name: "Days this routine runs" }), pad: 6 },
      { n: 3, loc: page.getByText(/sets, about/) },
      { n: 4, loc: page.getByRole("button", { name: /^Straight sets/ }), pad: 6, at: "b" },
      { n: 5, loc: [page.getByRole("button", { name: "Move block 2 earlier" }), page.getByRole("button", { name: "Move block 2 later" })], at: "r", pad: 2 },
      { n: 6, loc: page.getByRole("button", { name: "Start this routine" }) },
    ],
    legend: [
      ["Name", "Saves when you tap away from the field."],
      ["Days", "Saves the moment you tap a day."],
      ["Totals", "Sets across every block, and a rough time based on about 75 seconds a set."],
      ["Block", "Its kind, how many rounds, and the exercises in it. Tap to change rounds or exercises."],
      ["Reorder", "Moves a block earlier or later in the routine."],
      ["Start this routine", "Runs it now, whatever day it is."],
    ],
  });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await shot(page, "builder-bottom", {
    title: "Routine builder, further down", route: "/routines/[id]",
    marks: [
      { n: 1, loc: page.getByRole("button", { name: "Add another block" }) },
      { n: 2, loc: page.locator("div", { has: page.getByRole("heading", { name: "What this covers" }) }).last(), pad: 6 },
      { n: 3, loc: page.getByRole("button", { name: "Delete this routine" }), at: "r" },
    ],
    legend: [
      ["Add another block", "Opens the exercise picker for a new block at the end."],
      ["What this covers", "Every muscle tagged on the routine's exercises, on one body map. Gaps show what it misses."],
      ["Delete this routine", "Asks first. Your exercises stay in the library and finished sessions keep their record."],
    ],
  });
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.getByRole("button", { name: /^Straight sets/ }).click();
  const block = page.getByRole("dialog");
  await block.waitFor();
  await page.waitForTimeout(500);
  await shot(page, "block-settings", {
    title: "Block settings", route: "/routines/[id]",
    clip: await dialogClip(page),
    marks: [
      { n: 1, loc: [block.getByRole("button", { name: "One fewer" }), block.getByRole("button", { name: "One more" })], pad: 6 },
      { n: 2, loc: block.locator("li").first(), pad: 2 },
      { n: 3, loc: [block.getByRole("button", { name: "Pair with another exercise" }), block.getByText(/turns this into a superset/)], pad: 6 },
      { n: 4, loc: block.getByRole("button", { name: "Remove this block" }), at: "r" },
    ],
    legend: [
      ["Sets / Rounds", "How many times the block repeats, from 1 to 50."],
      ["Exercise", "The bin takes it out of the block. Removing the last one removes the block."],
      ["Pair with another exercise", "Adds a second exercise and turns straight sets into a superset; a third makes a circuit."],
      ["Remove this block", "Takes the whole block out of the routine."],
    ],
  });
  await block.getByRole("button", { name: "Close" }).last().click();

  await page.getByRole("button", { name: "Add another block" }).click();
  const picker = page.getByRole("dialog");
  await picker.waitFor();
  await page.waitForTimeout(500);
  await picker.getByRole("button", { name: /Box Jumps/ }).click();
  await picker.getByRole("button", { name: /Plank Hold/ }).click();
  await page.waitForTimeout(200);
  await shot(page, "picker", {
    title: "Exercise picker", route: "/routines/[id]",
    clip: await dialogClip(page),
    marks: [
      { n: 1, loc: [picker.getByRole("searchbox"), picker.locator(".rail").first()], pad: 6, at: "r" },
      { n: 2, loc: [picker.getByRole("button", { name: /Box Jumps/ }), picker.getByRole("button", { name: /Plank Hold/ })], pad: 2, at: "r" },
      { n: 3, loc: picker.getByRole("button", { name: "Add as a superset" }) },
    ],
    legend: [
      ["Search and filter", "Narrow the list by name or category."],
      ["Ticked exercises", "Tick as many as the block needs, in the order you'll do them."],
      ["Add button", "Names what a new block becomes: one exercise is straight sets, two a superset, three or more a circuit. Opened from Pair, it adds to that block instead."],
    ],
  });
  await picker.getByRole("button", { name: "Close" }).last().click();

  /* --- Session mode ----------------------------------------------------------- */
  // Session mode paints from a cached snapshot first; drop it so each scenario lands fresh.
  const openSession = async (name) => {
    await setScenario(name);
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("cb.session.v1.")).forEach((k) => localStorage.removeItem(k)),
    );
    await page.goto(`${base}/session/s-live`);
    await settle(page, 1400);
  };

  await openSession("straight");
  await shot(page, "session-straight", {
    title: "Session mode: straight sets", route: "/session/[id]",
    marks: [
      { n: 1, loc: page.getByRole("group", { name: "Blocks" }), pad: 2 },
      { n: 2, loc: page.getByRole("button", { name: /frame 1 of 3/ }), pad: 2 },
      { n: 3, loc: page.getByRole("group", { name: "Sets for Goblet Squat" }), pad: 6 },
      { n: 4, loc: page.getByRole("button", { name: /^Done, set/ }) },
      { n: 5, loc: page.getByRole("button", { name: "Swap" }), at: "tl", pad: 2 },
      { n: 6, loc: page.getByRole("button", { name: "End early" }), at: "tr", pad: 2 },
      { n: 7, loc: page.getByRole("button", { name: "Leave this session" }), pad: 0 },
    ],
    legend: [
      ["Block progress", "One bar per block, filling as sets are ticked. Tap a bar to jump to it, or swipe sideways."],
      ["Photo sequence", "Tap the photo to step through the frames; the play button loops them."],
      ["Set squares", "One per set. Tap any square to tick or untick it, in any order."],
      ["Done", "Ticks the next set. When the block is finished it slides on to the next one."],
      ["Swap", "Use a different exercise for this session only. The routine is unchanged."],
      ["End early", "Finishes now and logs what you've ticked. It doesn't ask first, and a finished session can't be reopened."],
      ["Leave", "Leave it running for later, or finish and log it."],
    ],
  });

  await page.getByRole("button", { name: "Leave this session" }).click();
  const leave = page.getByRole("dialog");
  await leave.waitFor();
  await page.waitForTimeout(300);
  await shot(page, "leave", {
    title: "Leaving a session", route: "/session/[id]",
    clip: await dialogClip(page),
    marks: [
      { n: 1, loc: leave.getByRole("button", { name: "Leave it running" }) },
      { n: 2, loc: leave.getByRole("button", { name: "Finish and log it" }) },
    ],
    legend: [
      ["Leave it running", "Back to Today. Every ticked set is kept; Resume on Today or History picks it up."],
      ["Finish and log it", "Ends the session with the sets you've ticked and opens History."],
    ],
  });
  await leave.getByRole("button", { name: "Close" }).last().click();

  await openSession("superset");
  const card = page.locator('section[aria-label="Block 2 of 3"]');
  await shot(page, "session-superset", {
    title: "Session mode: a superset", route: "/session/[id]",
    marks: [
      { n: 1, loc: card.getByText(/Round 2 of 3/), at: "r", pad: 2 },
      { n: 2, loc: [card.getByText("A", { exact: true }), card.getByText("Bench Press", { exact: true }), card.getByRole("group", { name: "Sets for Mountain Climbers" })], pad: 8, at: "r" },
      { n: 3, loc: page.getByRole("button", { name: /^Done, round/ }) },
    ],
    legend: [
      ["Round counter", "Supersets and circuits count rounds. One round is one set of every exercise in the block."],
      ["Exercises A and B", "Do A, then B, then start the next round. Each exercise has its own row of squares."],
      ["Done, round", "Ticks the round for every exercise at once."],
    ],
  });

  await page.getByRole("button", { name: "Swap" }).click();
  const swap = page.getByRole("dialog");
  await swap.waitFor();
  await page.waitForTimeout(300);
  await shot(page, "swap-which", {
    title: "Swap: choose the exercise", route: "/session/[id]",
    clip: await dialogClip(page),
    marks: [{ n: 1, loc: swap.locator("ul"), pad: 4 }],
    legend: [["Which one", "In a superset or circuit, first pick the exercise you're replacing."]],
  });
  await swap.getByRole("button", { name: /Bench Press/ }).click();
  await page.waitForTimeout(400);
  await shot(page, "swap", {
    title: "Swap: choose the replacement", route: "/session/[id]",
    focusAlso: [swap.getByRole("heading").first()],
    clip: await dialogClip(page),
    marks: [{ n: 1, loc: swap.locator("ul"), pad: 4, at: "r" }],
    legend: [["Replacement", "Any exercise in your library. Tap one to swap it in for this session; sets already ticked for the old one are cleared."]],
  });
  await swap.getByRole("button", { name: "Close" }).last().click();

  await openSession("finished");
  await shot(page, "finished", {
    title: "Every set done", route: "/session/[id]",
    clip: { x: 0, y: VIEW.height - 210, width: VIEW.width, height: 210 },
    marks: [{ n: 1, loc: page.getByRole("button", { name: "Finish session" }) }],
    legend: [["Finish session", "Appears once every set is ticked. Logs the session and opens History."]],
  });

  /* --- History ---------------------------------------------------------------- */
  await setScenario("plain");
  await page.goto(`${base}/history`);
  await settle(page);
  await shot(page, "history", {
    title: "History", route: "/history",
    marks: [
      { n: 1, loc: page.locator("li", { hasText: "still open" }), pad: 0, at: "r" },
      { n: 2, loc: page.locator("li", { hasText: "Leg Day" }).first(), pad: 0, at: "tr" },
      { n: 3, loc: page.getByRole("button", { name: "Sign out" }), at: "r" },
    ],
    legend: [
      ["Unfinished session", "Still open. Resume picks it up where you left it."],
      ["Finished session", "Date, a bar of sets done, the total, and how long it took."],
      ["Sign out", "The only account control in the app."],
    ],
  });

  /* --- Brand-new account ------------------------------------------------------ */
  await setScenario("empty");
  await page.goto(`${base}/today`);
  await settle(page);
  await shot(page, "today-empty", {
    title: "Today on a new account", route: "/today",
    focusAlso: [page.getByText("Nothing scheduled yet")],
    marks: [
      { n: 1, loc: page.getByRole("button", { name: "Create a routine" }) },
      { n: 2, loc: page.getByRole("link", { name: "How Circuit Book works" }), at: "r" },
    ],
    legend: [
      ["Create a routine", "The first step on a new account: it opens Routines."],
      ["How Circuit Book works", "Opens the guide, where this tour lives too."],
    ],
  });
  await setScenario("plain");

  await browser.close();
  if (errors.length) console.warn("Page errors during capture:\n  " + errors.join("\n  "));
  return manifest;
}
