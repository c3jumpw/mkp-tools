import AppFrame from "@/components/AppFrame";

type Section = {
  id: string;
  title: string;
  body: string[];
  image?: string;
  alt?: string;
};

const SECTIONS: Section[] = [
  {
    id: "start",
    title: "Sign in and install",
    body: [
      "Create an account with an email and password, or sign in if you already have one — there's no separate setup step beyond that.",
      "To use Circuit Book like a regular app, open it in your phone's browser and add it to your home screen (Safari: Share → Add to Home Screen; Chrome: menu → Install app). It then opens full-screen, with no browser bar, and keeps working without a signal.",
    ],
    image: "/guide/login.webp",
    alt: "The Circuit Book sign-in screen",
  },
  {
    id: "today",
    title: "Today — your daily dashboard",
    body: [
      "Today opens to whatever is scheduled for the current day. A routine already in progress sits at the top with a Resume button and a progress strip; anything scheduled for today sits below it, each with a one-tap Start.",
      "Routines not scheduled for today are still listed further down, so you can run one off-schedule whenever you want.",
    ],
    image: "/guide/today.webp",
    alt: "The Today page showing an in-progress session and two scheduled routines",
  },
  {
    id: "library",
    title: "Library — build your exercises once",
    body: [
      "Every exercise you do lives here once: a name, a target (sets × reps, or a timer), a category, and what it works. Search and the category/muscle filters make a long list easy to narrow down.",
      "Tap New or tap any row to open the editor.",
    ],
    image: "/guide/library.webp",
    alt: "The Library page listing six exercises with filters",
  },
  {
    id: "editor",
    title: "The workout editor",
    body: [
      "Add up to six photos — they play back in order during a session, so you can show the full movement, not just one pose. Set a target, pick or type a category, tag the muscles it works on the body map, and add any cue you want to see mid-set.",
      "Deleting a workout here removes it from every routine that uses it, but any already-finished session keeps its own record.",
    ],
    image: "/guide/workout-editor.webp",
    alt: "The workout editor open for Goblet Squat, with photos, target and muscle tags",
  },
  {
    id: "routines",
    title: "Routines — plan the week",
    body: [
      "A routine is an ordered list of blocks, assigned to any days of the week you like — a day can hold more than one routine.",
    ],
    image: "/guide/routines.webp",
    alt: "The Routines list with day strips showing when each one runs",
  },
  {
    id: "blocks",
    title: "Blocks: straight sets, supersets, circuits",
    body: [
      "A block with one exercise runs as straight sets. Add a second exercise and it becomes a superset — alternating between the two each round. Add a third and it becomes a circuit. The rounds stepper controls how many times the block repeats.",
      "Tap any block to open its settings: change the round count, add or remove exercises, or remove the block entirely.",
    ],
    image: "/guide/routine-builder.webp",
    alt: "A routine builder showing straight-set, superset and circuit blocks",
  },
  {
    id: "session",
    title: "Session mode — run the workout",
    body: [
      "Starting a routine opens one full-screen card per block. The big button at the bottom marks every exercise's current set (or round, for a superset/circuit) complete in a single tap — the fast way through a workout. Any individual set can also be tapped directly if you work out of order.",
      "Swap stands in a different exercise for this session only, without touching the routine. End early finishes and logs whatever is done so far.",
    ],
    image: "/guide/session-straight.webp",
    alt: "Session mode showing a Goblet Squat straight-set block with its set dots",
  },
  {
    id: "history",
    title: "History — what you've finished",
    body: [
      "Every finished (or abandoned) session lands here with the date, a progress strip, and how long it took. An unfinished session gets a Resume button so you can pick it back up.",
      "Sign out lives at the bottom of this page.",
    ],
    image: "/guide/history.webp",
    alt: "The History page listing four past sessions",
  },
  {
    id: "offline",
    title: "Working offline",
    body: [
      "Nothing waits on a connection. Every tap during a session is saved on your phone immediately and sent the moment a signal is back — automatically, with no action needed from you. A small pill above the tab bar appears only when something is still waiting to sync.",
    ],
  },
];

export default function GuidePage() {
  return (
    <AppFrame title="Guide">
      <div className="px-4 pt-5">
        <p className="text-sm leading-relaxed text-muted">
          A quick tour of every page in Circuit Book — what it's for, and how to use it.
        </p>
      </div>

      {SECTIONS.map((section, i) => (
        <section
          key={section.id}
          id={section.id}
          className={`px-4 pt-8 ${i === SECTIONS.length - 1 ? "pb-4" : ""}`}
        >
          <h2 className="ex text-lg font-bold">{section.title}</h2>
          <div className="mt-2 space-y-2.5">
            {section.body.map((p, j) => (
              <p key={j} className="text-sm leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </div>
          {section.image && (
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              {/* Static guide screenshots, served from /public — not optimized at request time. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={section.image} alt={section.alt} loading="lazy" decoding="async" className="w-full" />
            </div>
          )}
        </section>
      ))}
    </AppFrame>
  );
}
