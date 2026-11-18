"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Focus, Legend } from "@/components/GuideParts";
import { Button } from "@/components/ui";
import { TOUR_SEEN_KEY } from "@/lib/tour";
import { CHAPTERS, SLIDES } from "./slides";


/** The last slide is the send-off, not a screen of the app. */
const COUNT = SLIDES.length + 1;

const FIRST_OF = Object.fromEntries(
  CHAPTERS.map((c) => [c, SLIDES.findIndex((s) => s.chapter === c)]),
) as Record<(typeof CHAPTERS)[number], number>;

export default function Tour() {
  const router = useRouter();
  const strip = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const [from, setFrom] = useState("/today");

  useEffect(() => {
    try {
      localStorage.setItem(TOUR_SEEN_KEY, "seen");
    } catch {
      /* private mode: the tour may open again next time, which is harmless */
    }
    const f = new URLSearchParams(window.location.search).get("from");
    // Only ever return to a page of this app.
    if (f && f.startsWith("/") && !f.startsWith("//")) setFrom(f);
  }, []);

  const go = useCallback((i: number) => {
    const el = strip.current;
    if (!el) return;
    const n = Math.max(0, Math.min(COUNT - 1, i));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: n * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }, []);

  const close = useCallback(() => router.replace(from), [router, from]);

  // The strip's scroll position is the source of truth, so a swipe and a
  // button press land in the same place.
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setIndex(Math.round(el.scrollLeft / el.clientWidth)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, close, index]);

  // Each slide scrolls on its own; start every one at the top.
  useEffect(() => {
    strip.current?.children[index]?.scrollTo?.({ top: 0 });
  }, [index]);

  const current = SLIDES[index];
  const chapter = current?.chapter;
  const last = index === COUNT - 1;

  // Keep the current chapter's chip in view on narrow screens.
  useEffect(() => {
    chips.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [chapter]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-base">
      <header className="pad-safe-t shrink-0 border-b border-line-soft">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 pt-3">
          <p className="text-sm font-semibold text-chalk">
            Getting started{" "}
            <span className="tnum font-normal text-faint">
              · {index + 1} of {COUNT}
            </span>
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close the tour"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-muted active:bg-raise"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav ref={chips} aria-label="Tour chapters" className="rail mx-auto flex w-full max-w-lg gap-1.5 overflow-x-auto px-4 pt-2 pb-3">
          {CHAPTERS.map((c) => {
            const active = c === chapter;
            return (
              <button
                key={c}
                type="button"
                onClick={() => go(FIRST_OF[c])}
                aria-current={active ? "step" : undefined}
                className={`inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 text-xs font-medium whitespace-nowrap ${
                  active ? "border-chalk/60 bg-raise text-chalk" : "border-line text-faint active:bg-raise"
                }`}
              >
                {c}
              </button>
            );
          })}
        </nav>

        <div className="h-0.5 bg-line" aria-hidden="true">
          <div
            className="h-full bg-lime transition-[width] duration-300"
            style={{ width: `${((index + 1) / COUNT) * 100}%` }}
          />
        </div>
      </header>

      <div
        ref={strip}
        className="snap-x-strip flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label="Getting started tour"
      >
        {SLIDES.map((s, i) => (
          <section
            key={s.title}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${COUNT}: ${s.title}`}
            inert={i !== index}
            className="snap-item h-full w-full shrink-0 overflow-y-auto"
          >
            <div className="mx-auto w-full max-w-lg px-4 pt-5 pb-8">
              <p className="text-xs font-semibold tracking-wide text-faint uppercase">{s.chapter}</p>
              <h2 className="ex-tight mt-1 text-[1.6rem] leading-tight font-bold">{s.title}</h2>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-chalk">
                {s.body}
              </p>
              {s.fig && (
                <figure className="mt-5">
                  {/* The neighbours load early so a swipe never lands on a blank frame. */}
                  <Focus name={s.fig} eager={Math.abs(i - index) <= 1} />
                  <figcaption className="mx-auto mt-4 max-w-[340px]">
                    <Legend name={s.fig} />
                  </figcaption>
                </figure>
              )}
              {s.extra}
            </div>
            {/* Says "there's more below" on slides taller than the screen. */}
            <div aria-hidden="true" className="pointer-events-none sticky bottom-0 -mt-8 h-8 bg-linear-to-t from-base" />
          </section>
        ))}

        <section
          role="group"
          aria-roledescription="slide"
          aria-label={`${COUNT} of ${COUNT}: You're set`}
          inert={!last}
          className="snap-item h-full w-full shrink-0 overflow-y-auto"
        >
          <div className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-4 py-8">
            <h2 className="ex-tight text-[1.9rem] leading-tight font-bold">You&rsquo;re set</h2>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">
              Start by adding the exercises you do. You can replay this tour, or read every screen
              in detail, from the <b className="font-semibold text-chalk">?</b> button on Today,
              Library, Routines and History.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <Button size="lg" onClick={() => router.replace("/library")}>
                Add your first exercise
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.replace("/guide")}>
                Open the full guide
              </Button>
              <Button variant="ghost" onClick={close} className="text-muted">
                {from === "/today" ? "Go to Today" : "Back to where I was"}
              </Button>
            </div>
          </div>
        </section>
      </div>

      <footer className="pad-safe-b shrink-0 border-t border-line-soft">
        <div className="mx-auto flex w-full max-w-lg gap-3 px-4 py-3">
          <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0} className="flex-1">
            Back
          </Button>
          {last ? (
            <Button onClick={close} className="flex-[2]">
              Done
            </Button>
          ) : (
            <Button onClick={() => go(index + 1)} className="flex-[2]">
              {index === 0 ? "Show me" : "Next"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
