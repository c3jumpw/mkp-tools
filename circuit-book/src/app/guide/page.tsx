import type { Metadata } from "next";
import AppFrame from "@/components/AppFrame";
import { FIGURES, type FigureName } from "./figures";

export const metadata: Metadata = { title: "Guide · Circuit Book" };

/* The rings and numbers drawn on every screenshot use this blue, so the legend
   badges match them. It is deliberately not lime: lime means state in the app,
   and a callout is not a state. */
const CALLOUT = "bg-[#5ab0ff] text-[#0e1110]";

const JUMPS: [string, string][] = [
  ["start", "Start"],
  ["today", "Today"],
  ["library", "Library"],
  ["routines", "Routines"],
  ["session", "Session"],
  ["history", "History"],
  ["offline", "Offline"],
  ["faq", "FAQ"],
];

export default function GuidePage() {
  return (
    <AppFrame title="Guide">
      <div className="px-4 pt-5">
        <p className="text-sm leading-relaxed text-muted">
          How every screen works. The blue numbers on each picture match the list under it.
        </p>
      </div>

      <nav aria-label="Guide sections" className="rail flex gap-2 overflow-x-auto px-4 pt-4 pb-1">
        {JUMPS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex min-h-9 items-center rounded-full border border-line px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted active:bg-raise"
          >
            {label}
          </a>
        ))}
      </nav>

      <Section id="start" title="Getting started">
        <ol className="mt-3 space-y-3">
          <Step n={1} title="Install it">
            iPhone: Safari&rsquo;s <b>Share</b> button, then <b>Add to Home Screen</b>. Android: Chrome&rsquo;s{" "}
            <b>&#8942;</b> menu, then <b>Install app</b>. It then opens full-screen like any app.
          </Step>
          <Step n={2} title="Add your exercises">
            Library &rarr; <b>New</b>. Only the name is required.
          </Step>
          <Step n={3} title="Build a routine">
            Routines &rarr; <b>New</b>, name it, tick its days, then <b>Add a block</b>.
          </Step>
          <Step n={4} title="Train">
            On a scheduled day it waits on Today. Tap <b>Start</b>.
          </Step>
        </ol>
        <Flow />
      </Section>

      <Section id="today" title="Today">
        <P>
          The home screen. It shows what is due this weekday, with anything left unfinished pinned
          above it.
        </P>
        <Fig name="today" />
      </Section>

      <Section id="library" title="Library">
        <P>
          Each exercise is entered once and reused by every routine. Sessions already logged keep
          what was done, even if you edit or delete the exercise later.
        </P>
        <Fig name="library" />
        <P>Tapping an exercise, or New, opens the editor.</P>
        <Fig name="editor-top" />
        <Fig name="editor-muscles" />
        <Fig name="editor-bottom" />
      </Section>

      <Section id="routines" title="Routines and blocks">
        <P>
          A routine is a list of blocks, set to any days of the week. How many exercises a block
          holds decides the order of its sets:
        </P>
        <SetOrder />
        <Fig name="routines" />
        <Fig name="new-routine" />
        <Fig name="builder-top" />
        <Fig name="builder-bottom" />
        <P>Tap a block to change its rounds or exercises. Pairing a second exercise makes a superset.</P>
        <Fig name="block-settings" />
        <Fig name="picker" />
      </Section>

      <Section id="session" title="Session mode">
        <P>
          One full-screen card per block. For most sets the only tap you need is the big Done
          button at the bottom.
        </P>
        <Fig name="session-straight" />
        <P>In a superset or circuit, Done ticks the whole round at once.</P>
        <Fig name="session-superset" />
        <P>Swap changes this session only. In a superset it first asks which exercise to replace.</P>
        <Fig name="swap-which" />
        <Fig name="swap" />
        <Fig name="leave" />
        <Fig name="finished" />
      </Section>

      <Section id="history" title="History and your account">
        <Fig name="history" />
        <P>
          There is no settings screen: days live on each routine, targets and photos on each
          exercise. Sign out is the only account control.
        </P>
      </Section>

      <Section id="offline" title="Working offline">
        <P>
          A running session keeps working with no signal. Changes wait on the phone and send
          themselves when the connection is back, stamped with the time you tapped.
        </P>
        <Fig name="offline" />
        <div className="mt-5 grid gap-3">
          <Card title="Works with no signal">
            <li>The session you&rsquo;re in: ticking sets, swapping, finishing</li>
            <li>Reopening that session after closing the app</li>
            <li>Photos and pages you&rsquo;ve already viewed on this phone</li>
          </Card>
          <Card title="Needs a signal">
            <li>Starting a new session</li>
            <li>Loading Today, Library, Routines and History</li>
            <li>Adding or editing exercises and routines</li>
          </Card>
        </div>
      </Section>

      <Section id="faq" title="Questions">
        <div className="mt-2 divide-y divide-line-soft border-y border-line-soft">
          <Faq q="I forgot my password">
            There is no reset link in the app. Whoever runs Circuit Book can send a reset from the
            Supabase dashboard, under Authentication, Users.
          </Faq>
          <Faq q="An exercise shows grey bars instead of a photo">
            The photo has not loaded yet. Photos need a signal the first time; after that they are
            kept on the phone.
          </Faq>
          <Faq q="I deleted an exercise. Is my history gone?">
            No. Each logged session keeps its own copy of what was done, including names and
            targets.
          </Faq>
          <Faq q="I edited a routine mid-session. Which version am I doing?">
            The one you started. A session copies the routine when it begins; edits apply from the
            next one.
          </Faq>
          <Faq q="Can two routines share a day?">
            Yes. Both appear on Today that day, each with its own Start.
          </Faq>
          <Faq q="Can I use it on more than one device?">
            Yes. Sign in with the same email on each. Only changes not yet sent wait on the phone
            where you made them.
          </Faq>
        </div>
      </Section>

      <div className="h-6" />
    </AppFrame>
  );
}

/* ------------------------------------------------------------------ */

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 px-4 pt-10">
      <h2 className="ex text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-2.5 text-sm leading-relaxed text-muted">{children}</p>;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-raise text-sm font-bold text-chalk">
        {n}
      </span>
      <span className="min-w-0 pt-0.5 text-sm leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-chalk">
        <span className="block font-semibold text-chalk">{title}</span>
        {children}
      </span>
    </li>
  );
}

/** An annotated screenshot with its numbered legend. */
function Fig({ name }: { name: FigureName }) {
  const f = FIGURES[name];
  return (
    <figure className="mt-5">
      <div className="mx-auto max-w-[340px] overflow-hidden rounded-2xl border border-line">
        {/* Static screenshots from /public; nothing to gain from the image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={f.src}
          width={f.width}
          height={f.height}
          alt={`${f.title}, with ${f.legend.length} numbered callouts`}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
      <figcaption className="mx-auto mt-3 max-w-[340px]">
        <span className="sr-only">{f.title}</span>
        <ol className="space-y-2.5">
          {f.legend.map(([label, text], i) => (
            <li key={label} className="flex gap-2.5">
              <span
                className={`tnum grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold ${CALLOUT}`}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span className="min-w-0 text-sm leading-snug">
                <span className="font-semibold text-chalk">{label}.</span>{" "}
                <span className="text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}

/** Set up once, then every workout runs Today → Session → History. */
function Flow() {
  const setup: [string, string][] = [
    ["Library", "Each exercise once"],
    ["Routines", "Blocks, set to days"],
  ];
  const daily: [string, string][] = [
    ["Today", "What's due, plus anything unfinished"],
    ["Session", "One card per block"],
    ["History", "Every session; Resume if open"],
  ];
  return (
    <div className="mt-6 space-y-2" role="img" aria-label="Set up the Library and Routines once; each workout then goes Today, Session, History">
      <FlowGroup label="Set up once" items={setup} />
      <Arrow label="on its days" />
      <FlowGroup label="Every workout" items={daily} />
    </div>
  );
}

function FlowGroup({ label, items }: { label: string; items: [string, string][] }) {
  return (
    <div className="rounded-xl border border-line-soft bg-surface p-3">
      <span className="block px-1 pb-2 text-xs font-medium text-faint">{label}</span>
      <div className="space-y-1.5">
        {items.map(([name, text], i) => (
          <div key={name}>
            {i > 0 && <Arrow />}
            <div className="rounded-lg border border-line px-3 py-2">
              <span className="ex block text-sm font-semibold text-chalk">{name}</span>
              <span className="block text-xs text-muted">{text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5 pl-5 text-faint" aria-hidden="true">
      <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
        <path d="M6 1v13M1.5 9.5L6 14l4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}

/** The order sets are worked in, for each kind of block. */
function SetOrder() {
  const rows: { name: string; sub: string; rounds: string[][] }[] = [
    { name: "Straight sets", sub: "1 exercise, 4 sets", rounds: [["A1", "A2", "A3", "A4"]] },
    { name: "Superset", sub: "2 exercises, 3 rounds", rounds: [["A1", "B1"], ["A2", "B2"], ["A3", "B3"]] },
    { name: "Circuit", sub: "3 exercises, 3 rounds", rounds: [["A1", "B1", "C1"], ["A2", "B2", "C2"], ["A3", "B3", "C3"]] },
  ];
  return (
    <div className="mt-4 space-y-4 rounded-xl border border-line-soft bg-surface p-4">
      {rows.map((row) => (
        <div key={row.name}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="ex text-sm font-semibold text-chalk">{row.name}</span>
            <span className="text-xs text-faint">{row.sub}</span>
          </div>
          <ol className="mt-2 flex flex-wrap gap-x-3 gap-y-2" aria-label={`${row.name} order: ${row.rounds.flat().join(", ")}`}>
            {row.rounds.map((round, r) => (
              <li key={r} className="flex flex-col items-center gap-1">
                <span className="flex gap-1">
                  {round.map((set) => (
                    <span
                      key={set}
                      className={`tnum grid h-7 w-8 place-items-center rounded-md border text-xs font-bold ${
                        set.startsWith("A")
                          ? "border-line bg-raise text-chalk"
                          : set.startsWith("B")
                            ? "border-chalk/40 text-chalk"
                            : "border-dashed border-chalk/40 text-chalk"
                      }`}
                    >
                      {set}
                    </span>
                  ))}
                </span>
                {row.rounds.length > 1 && <span className="text-[0.65rem] text-faint">Round {r + 1}</span>}
              </li>
            ))}
          </ol>
        </div>
      ))}
      <p className="text-xs leading-relaxed text-faint">
        Letters are the exercises in the block, in order; the number is the round.
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <span className="ex block text-sm font-semibold text-chalk">{title}</span>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted marker:text-faint">{children}</ul>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-chalk [&::-webkit-details-marker]:hidden">
        {q}
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-faint transition-transform group-open:rotate-180"
        >
          <path d="M5 7.5l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <p className="pb-4 text-sm leading-relaxed text-muted">{children}</p>
    </details>
  );
}
