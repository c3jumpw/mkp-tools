import type { Metadata } from "next";
import Link from "next/link";
import AppFrame from "@/components/AppFrame";
import { Flow, ListCard, SetOrder, Shot } from "@/components/GuideParts";

export const metadata: Metadata = { title: "Guide · Circuit Book" };

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
        <Link
          href="/tour?from=/guide"
          className="mt-4 flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 active:bg-raise"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-raise text-chalk" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <rect x="2.5" y="4" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <path d="M15.5 6v8M18 7.5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="ex block text-[0.95rem] font-semibold text-chalk">Take the tour</span>
            <span className="block text-sm text-muted">Every screen, one slide at a time. About two minutes.</span>
          </span>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-faint">
            <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
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
        <P>Your account works on any phone or computer you sign in on.</P>
        <Shot name="login" />
        <P>A new account opens on an empty Today, pointing you to your first routine.</P>
        <Shot name="today-empty" />
      </Section>

      <Section id="today" title="Today">
        <P>
          The home screen. It shows what is due this weekday, with your most recent unfinished
          session pinned above it.
        </P>
        <Shot name="today" />
      </Section>

      <Section id="library" title="Library">
        <P>
          Each exercise is entered once and reused by every routine. Edits show up the next time a
          routine using it starts; sessions already logged keep what was done.
        </P>
        <Shot name="library" />
        <P>Tapping an exercise, or New, opens the editor.</P>
        <Shot name="editor-top" />
        <Shot name="editor-muscles" />
        <Shot name="editor-bottom" />
      </Section>

      <Section id="routines" title="Routines and blocks">
        <P>
          A routine is a list of blocks, set to any days of the week. How many exercises a block
          holds decides the order of its sets:
        </P>
        <SetOrder />
        <Shot name="routines" />
        <Shot name="new-routine" />
        <Shot name="builder-top" />
        <Shot name="builder-bottom" />
        <P>Tap a block to change its rounds or exercises. Pairing a second exercise makes a superset.</P>
        <Shot name="block-settings" />
        <Shot name="picker" />
      </Section>

      <Section id="session" title="Session mode">
        <P>
          One full-screen card per block. For most sets the only tap you need is the big Done
          button at the bottom.
        </P>
        <Shot name="session-straight" />
        <P>In a superset or circuit, Done ticks the whole round at once.</P>
        <Shot name="session-superset" />
        <P>Swap changes this session only. In a superset it first asks which exercise to replace.</P>
        <Shot name="swap-which" />
        <Shot name="swap" />
        <Shot name="leave" />
        <Shot name="finished" />
        <P>
          The Edit in library link at the bottom of each card leaves the session open; Resume on
          Today brings you back to it.
        </P>
      </Section>

      <Section id="history" title="History and your account">
        <Shot name="history" />
        <P>
          There is no settings screen: days live on each routine, targets and photos on each
          exercise. Sign out is the only account control.
        </P>
      </Section>

      <Section id="offline" title="Working offline">
        <P>
          An open session keeps working with no signal. Changes wait on the phone and send
          themselves when the connection is back, stamped with the time you tapped. Keep the app
          open: once it is closed, you need a signal to get back in.
        </P>
        <Shot name="offline" />
        <div className="mt-5 grid gap-3">
          <ListCard title="Works with no signal">
            <li>The session you have open: ticking sets and finishing</li>
            <li>Swapping, if the session was opened with a signal</li>
            <li>Photos you&rsquo;ve already seen, while the app stays open</li>
          </ListCard>
          <ListCard title="Needs a signal">
            <li>Starting a session</li>
            <li>Getting back in after closing the app, including Resume</li>
            <li>Loading Today, Library, Routines and History</li>
            <li>Adding or editing exercises and routines</li>
          </ListCard>
        </div>
      </Section>

      <Section id="faq" title="Questions">
        <div className="mt-2 divide-y divide-line-soft border-y border-line-soft">
          <Faq q="I forgot my password">
            The app can&rsquo;t reset passwords yet: there is no screen to choose a new one. Ask
            whoever runs Circuit Book to set a new password for your account.
          </Faq>
          <Faq q="An exercise shows grey bars instead of a photo">
            Either it has no photo yet, or the photo hasn&rsquo;t loaded. Photos need a signal to
            load each time the app is reopened.
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
