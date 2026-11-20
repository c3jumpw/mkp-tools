/**
 * The getting-started tour, one entry per slide, in order.
 *
 * Every screenshot in src/app/guide/figures.ts must appear here, and every
 * page in the app must have a screenshot: `npm run guide:check` fails the
 * build in CI otherwise. So when you add a screen or a feature:
 *   1. add a `shot(...)` for it in guide-capture/capture.mjs,
 *   2. add a slide for it below (and a <Shot> on the Guide page),
 *   3. run `npm run guide:capture`, or let CI do it on push.
 */
import { Flow, ListCard, SetOrder } from "@/components/GuideParts";
import type { FigureName } from "@/app/guide/figures";
import type { Audience } from "@/lib/roles";

export type Slide = {
  chapter: Chapter;
  title: string;
  body: React.ReactNode;
  /** An annotated screenshot, shown cropped to its callouts with the legend under it. */
  fig?: FigureName;
  /** A diagram or list in place of, or under, the screenshot. */
  extra?: React.ReactNode;
  /** Who sees the slide. Default: everyone. */
  audience?: Audience;
};

export const CHAPTERS = ["Start", "Library", "Routines", "Session", "History", "Offline", "Admin"] as const;
export type Chapter = (typeof CHAPTERS)[number];

export const SLIDES: Slide[] = [
  /* --- Start ----------------------------------------------------------- */
  {
    chapter: "Start",
    title: "Circuit Book in two minutes",
    body: (
      <>
        Set up your exercises and routines once. After that, every workout is the same three
        steps: open <b>Today</b>, tap <b>Start</b>, tick off your sets. Swipe or tap{" "}
        <b>Next</b> to walk through each screen.
      </>
    ),
    extra: <Flow className="mt-5" />,
  },
  {
    chapter: "Start",
    title: "Sign in, then install it",
    body: (
      <>
        Your library, routines and history follow your account to any phone or computer. To
        install: on iPhone, Safari&rsquo;s <b>Share</b> button, then <b>Add to Home Screen</b>; on
        Android, Chrome&rsquo;s <b>&#8942;</b> menu, then <b>Install app</b>.
      </>
    ),
    fig: "login",
  },
  {
    chapter: "Start",
    title: "Your first visit",
    body: (
      <>
        A new account starts empty. Add a few exercises to the <b>Library</b> first, then build a
        routine from them.
      </>
    ),
    fig: "today-empty",
  },
  {
    chapter: "Start",
    title: "Today",
    body: (
      <>
        The home screen. It shows what&rsquo;s set for this weekday, with your most recent
        unfinished session pinned above it.
      </>
    ),
    fig: "today",
  },

  /* --- Library --------------------------------------------------------- */
  {
    chapter: "Library",
    title: "Your exercise library",
    body: (
      <>
        Enter each exercise once; every routine reuses it. Edits show up the next time a routine
        using it starts, and sessions already logged keep what was done.
      </>
    ),
    fig: "library",
  },
  {
    chapter: "Library",
    title: "Add an exercise",
    body: (
      <>
        <b>New</b>, or tapping any exercise, opens the editor. Only the name is required.
      </>
    ),
    fig: "editor-top",
  },
  {
    chapter: "Library",
    title: "Mark what it works",
    body: <>Tap the body map or the list. Each routine adds these up to show what it covers.</>,
    fig: "editor-muscles",
  },
  {
    chapter: "Library",
    title: "Category, notes, save",
    body: <>Further down the same editor.</>,
    fig: "editor-bottom",
  },

  /* --- Routines -------------------------------------------------------- */
  {
    chapter: "Routines",
    title: "Routines",
    body: (
      <>
        A routine is a list of blocks, set to any days of the week. On those days it waits on
        Today.
      </>
    ),
    fig: "routines",
  },
  {
    chapter: "Routines",
    title: "Create a routine",
    body: <>Name it and tick its days. You can change both later.</>,
    fig: "new-routine",
  },
  {
    chapter: "Routines",
    title: "Build it from blocks",
    body: <>Blocks run top to bottom. Each holds one exercise or a group done back to back.</>,
    fig: "builder-top",
  },
  {
    chapter: "Routines",
    title: "Three kinds of block",
    body: <>How many exercises a block holds decides the order you work its sets in.</>,
    extra: <SetOrder className="mt-5" />,
  },
  {
    chapter: "Routines",
    title: "Block settings",
    body: <>Tap a block to change its sets or rounds, pair it with another exercise, or remove it.</>,
    fig: "block-settings",
  },
  {
    chapter: "Routines",
    title: "Add exercises to a block",
    body: <>Pick one for straight sets, or several to make a superset or circuit in one go.</>,
    fig: "picker",
  },
  {
    chapter: "Routines",
    title: "More blocks, and what it covers",
    body: <>The bottom of the builder.</>,
    fig: "builder-bottom",
  },

  /* --- Session --------------------------------------------------------- */
  {
    chapter: "Session",
    title: "Run a session",
    body: (
      <>
        <b>Start</b> on Today or in the builder opens one full-screen card per block. For most
        sets the only tap you need is the big <b>Done</b> button.
      </>
    ),
    fig: "session-straight",
  },
  {
    chapter: "Session",
    title: "Supersets and circuits",
    body: <>Do each exercise once, in order, then go round again. Done ticks the whole round.</>,
    fig: "session-superset",
  },
  {
    chapter: "Session",
    title: "Swap an exercise",
    body: (
      <>
        Station taken? <b>Swap</b> changes this session only. In a superset or circuit it first
        asks which exercise to replace&hellip;
      </>
    ),
    fig: "swap-which",
  },
  {
    chapter: "Session",
    title: "…then what to do instead",
    body: <>Any exercise in your library can stand in.</>,
    fig: "swap",
  },
  {
    chapter: "Session",
    title: "Step away",
    body: <>The ✕ in the top corner asks whether to keep the session open or finish it now.</>,
    fig: "leave",
  },
  {
    chapter: "Session",
    title: "Finish",
    body: <>Once every set is ticked, one tap logs the session.</>,
    fig: "finished",
  },

  /* --- History ----------------------------------------------------------- */
  {
    chapter: "History",
    title: "History",
    body: <>Every session, newest first, with Resume on any you left open.</>,
    fig: "history",
  },
  {
    chapter: "History",
    title: "Your account",
    body: (
      <>
        At the bottom of History. There&rsquo;s no settings screen: days live on each routine,
        targets and photos on each exercise.
      </>
    ),
    fig: "history-account",
  },
  {
    chapter: "History",
    title: "What’s new",
    body: (
      <>
        After an update, Today shows what changed the next time you open the app, once. It only
        lists changes that apply to you.
      </>
    ),
    fig: "whats-new",
  },

  /* --- Offline ----------------------------------------------------------- */
  {
    chapter: "Offline",
    title: "No signal? Keep going",
    body: (
      <>
        An open session keeps working offline. Changes wait on the phone and send themselves when
        the connection is back. Keep the app open: once it&rsquo;s closed, you need a signal to
        get back in.
      </>
    ),
    fig: "offline",
    extra: (
      <div className="mt-5 grid gap-3">
        <ListCard title="Works with no signal">
          <li>The session you have open: ticking sets and finishing</li>
          <li>Swapping, if the session was opened with a signal</li>
        </ListCard>
        <ListCard title="Needs a signal">
          <li>Starting a session, or getting back in after closing the app</li>
          <li>Adding or editing exercises and routines</li>
        </ListCard>
      </div>
    ),
  },

  /* --- Admin (admins only) ------------------------------------------------ */
  {
    chapter: "Admin",
    audience: "admins",
    title: "Change log",
    body: (
      <>
        Admins only: every change to Circuit Book since launch. Search or filter it, follow each
        change to its commits, and download the lot as JSON or CSV at the bottom of the page.
      </>
    ),
    fig: "admin-changelog",
  },
];
