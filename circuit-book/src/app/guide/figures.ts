/**
 * Annotated screenshots for the in-app guide, generated from the capture run
 * that produced them. Each legend entry matches the numbered callout drawn on
 * the image, in order.
 */

export type Figure = {
  src: string;
  width: number;
  height: number;
  title: string;
  legend: [label: string, text: string][];
};

export const FIGURES = {
  "block-settings": {
    src: "/guide/v2/block-settings.webp",
    width: 390,
    height: 507,
    title: "Block settings",
    legend: [
      ["Sets / Rounds", "How many times the block repeats, from 1 to 50."],
      ["Exercise", "The bin takes it out of the block. Removing the last one removes the block."],
      ["Pair with another exercise", "Adds a second exercise and turns straight sets into a superset; a third makes a circuit."],
      ["Remove this block", "Takes the whole block out of the routine."],
    ],
  },
  "builder-bottom": {
    src: "/guide/v2/builder-bottom.webp",
    width: 390,
    height: 844,
    title: "Routine builder, further down",
    legend: [
      ["Add another block", "Opens the exercise picker for a new block at the end."],
      ["What this covers", "Every muscle tagged on the routine's exercises, on one body map. Gaps show what it misses."],
      ["Delete this routine", "Asks first. Your exercises stay in the library and finished sessions keep their record."],
    ],
  },
  "builder-top": {
    src: "/guide/v2/builder-top.webp",
    width: 390,
    height: 844,
    title: "Routine builder",
    legend: [
      ["Name", "Saves when you tap away from the field."],
      ["Days", "Saves the moment you tap a day."],
      ["Totals", "Sets across every block, and a rough time based on about 75 seconds a set."],
      ["Block", "Its kind, how many rounds, and the exercises in it. Tap to change rounds or exercises."],
      ["Reorder", "Moves a block earlier or later in the routine."],
      ["Start this routine", "Runs it now, whatever day it is."],
    ],
  },
  "editor-bottom": {
    src: "/guide/v2/editor-bottom.webp",
    width: 390,
    height: 777,
    title: "Workout editor: category, notes and saving",
    legend: [
      ["Target area note", "Anything more specific about what the move works. It shows on the session card."],
      ["Category", "Tap a suggestion or type your own. Categories become the filter chips in the Library."],
      ["Notes", "Cues or working weight. They show under the set squares during a session."],
      ["Delete this workout", "Asks first. It leaves the library and every routine; finished sessions keep their record."],
      ["Save changes", "Nothing changes until you tap this. Close the sheet to discard edits."],
    ],
  },
  "editor-muscles": {
    src: "/guide/v2/editor-muscles.webp",
    width: 390,
    height: 777,
    title: "Workout editor: target area",
    legend: [
      ["Body map", "Tap a muscle on the front or back figure to tag it. Tagged muscles light up here and on the session card."],
      ["Muscle chips", "The same fifteen muscles as a list, grouped by upper body, core and lower body. Either way works."],
      ["Clear all", "Removes every tag."],
    ],
  },
  "editor-top": {
    src: "/guide/v2/editor-top.webp",
    width: 390,
    height: 777,
    title: "Workout editor: photos and target",
    legend: [
      ["Name", "The only field you have to fill in."],
      ["Photos", "Up to six, shown in this order during a session. The arrows reorder, the bin removes, and the first is the cover."],
      ["Add another photo", "Opens your photo library. Photos are shrunk on the phone before they upload."],
      ["Sets \u00d7 reps", "The target on the session card. Reps can be words, such as \"8 each side\"."],
      ["Time", "Minutes and seconds for holds and timed drills, instead of reps."],
    ],
  },
  "finished": {
    src: "/guide/v2/finished.webp",
    width: 390,
    height: 210,
    title: "Every set done",
    legend: [
      ["Finish session", "Appears once every set is ticked. Logs the session and opens History."],
    ],
  },
  "history": {
    src: "/guide/v2/history.webp",
    width: 390,
    height: 844,
    title: "History",
    legend: [
      ["Unfinished session", "Still open. Resume picks it up where you left it."],
      ["Finished session", "Date, a bar of sets done, the total, and how long it took."],
      ["Sign out", "The only account control in the app."],
    ],
  },
  "leave": {
    src: "/guide/v2/leave.webp",
    width: 390,
    height: 294,
    title: "Leaving a session",
    legend: [
      ["Leave it running", "Back to Today. Every ticked set is kept; Resume on Today or History picks it up."],
      ["Finish and log it", "Ends the session with the sets you've ticked and opens History."],
    ],
  },
  "library": {
    src: "/guide/v2/library.webp",
    width: 390,
    height: 844,
    title: "Library",
    legend: [
      ["New", "Adds an exercise and opens the editor."],
      ["Search", "Matches names, notes and categories as you type."],
      ["Category chips", "Show one category at a time; All clears the filter."],
      ["Muscle chips", "Show only exercises tagged with that muscle. Tap again to clear."],
      ["Exercise", "Cover photo, target, category and muscles worked. Tap to edit."],
    ],
  },
  "login": {
    src: "/guide/v2/login.webp",
    width: 390,
    height: 844,
    title: "Sign in",
    legend: [
      ["Email and password", "The same pair signs you in on any phone or computer."],
      ["Sign in", "Opens Today."],
      ["Create an account", "Switches the form to sign-up. Passwords need at least 6 characters."],
    ],
  },
  "new-routine": {
    src: "/guide/v2/new-routine.webp",
    width: 390,
    height: 376,
    title: "New routine",
    legend: [
      ["Name", "What you'll see on Today and in History."],
      ["Days", "Tap any number of days. A day can hold more than one routine, and you can change them later."],
      ["Create routine", "Opens the routine builder so you can add blocks."],
    ],
  },
  "offline": {
    src: "/guide/v2/offline.webp",
    width: 390,
    height: 324,
    title: "Changes waiting to sync",
    legend: [
      ["Sync pill", "Only shows while changes are queued on the phone. It disappears once they reach the server."],
    ],
  },
  "picker": {
    src: "/guide/v2/picker.webp",
    width: 390,
    height: 777,
    title: "Exercise picker",
    legend: [
      ["Search and filter", "Narrow the list by name or category."],
      ["Ticked exercises", "Tick as many as the block needs, in the order you'll do them."],
      ["Add button", "Names what you'll get: one exercise is straight sets, two a superset, three or more a circuit."],
    ],
  },
  "routines": {
    src: "/guide/v2/routines.webp",
    width: 390,
    height: 844,
    title: "Routines",
    legend: [
      ["New", "Name a routine and choose its days."],
      ["Routine", "Block count, and its days: lime squares are the days it runs, Sunday first. Tap to open the builder."],
      ["Not scheduled", "A routine with no days. It still appears on Today under Other routines."],
    ],
  },
  "session-straight": {
    src: "/guide/v2/session-straight.webp",
    width: 390,
    height: 844,
    title: "Session mode: straight sets",
    legend: [
      ["Block progress", "One bar per block, filling as sets are ticked. Tap a bar to jump to it, or swipe sideways."],
      ["Photo sequence", "Tap the photo to step through the frames; the play button loops them."],
      ["Set squares", "One per set. Tap any square to tick or untick it, in any order."],
      ["Done", "Ticks the next set. When the block is finished it slides on to the next one."],
      ["Swap", "Use a different exercise for this session only. The routine is unchanged."],
      ["End early", "Finishes now and logs what you've ticked."],
      ["Leave", "Leave it running for later, or finish and log it."],
    ],
  },
  "session-superset": {
    src: "/guide/v2/session-superset.webp",
    width: 390,
    height: 844,
    title: "Session mode: a superset",
    legend: [
      ["Round counter", "Supersets and circuits count rounds. One round is one set of every exercise in the block."],
      ["Exercises A and B", "Do A, then B, then start the next round. Each exercise has its own row of squares."],
      ["Done, round", "Ticks the round for every exercise at once."],
    ],
  },
  "swap-which": {
    src: "/guide/v2/swap-which.webp",
    width: 390,
    height: 278,
    title: "Swap: choose the exercise",
    legend: [
      ["Which one", "In a superset or circuit, first pick the exercise you're replacing."],
    ],
  },
  "swap": {
    src: "/guide/v2/swap.webp",
    width: 390,
    height: 593,
    title: "Swap: choose the replacement",
    legend: [
      ["Replacement", "Any exercise in your library. Tap one to swap it in for this session; sets already ticked for the old one are cleared."],
    ],
  },
  "today": {
    src: "/guide/v2/today.webp",
    width: 390,
    height: 844,
    title: "Today",
    legend: [
      ["In progress", "A session you left running. Resume opens it on the set you reached."],
      ["Scheduled today", "Routines set for this weekday, with total sets and a rough time. Start opens session mode."],
      ["Other routines", "Everything not scheduled today. Start runs one anyway; tap the name to edit it."],
      ["Guide", "Opens this guide. On the other tabs it sits next to the page title."],
      ["Tabs", "Today, Library, Routines and History, on every main screen."],
    ],
  },
} satisfies Record<string, Figure>;

export type FigureName = keyof typeof FIGURES;
