"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { findTarget } from "@/lib/tour/find";
import { SCREEN_H, SCREEN_W, screenUrl, type ScreenId } from "@/lib/tour/screens";
import { findSlide, slidesFor, type Slide } from "@/lib/tour/slides";
import { CURRENT_RELEASE, markTourSeen } from "@/lib/changelog";
import TourArt from "@/components/tour/TourArt";

type TrackKey = "everyone" | "owner" | "whatsnew";

const TRACKS: { key: TrackKey; label: string }[] = [
  { key: "everyone", label: "Everyone" },
  { key: "owner", label: "Owner" },
  { key: "whatsnew", label: "What's new" },
];

const WHATS_NEW_INTRO: Slide = {
  id: "whatsnew-intro",
  track: "everyone",
  chapter: "What's new",
  title: `What's new in ${CURRENT_RELEASE.version}`,
  body: `${CURRENT_RELEASE.title}, ${CURRENT_RELEASE.date}. The next steps show what changed.`,
  art: "whatsnew",
};

function slidesForTrack(track: TrackKey): Slide[] {
  if (track !== "whatsnew") return slidesFor(track);
  const extra = (CURRENT_RELEASE.slides || []).map(findSlide).filter((s): s is Slide => Boolean(s));
  return [WHATS_NEW_INTRO, ...extra];
}

type Box = { left: number; top: number; width: number; height: number } | null;

export default function Tour() {
  const [track, setTrack] = useState<TrackKey>("everyone");
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const slides = useMemo(() => slidesForTrack(track), [track]);
  const slide = slides[Math.min(index, slides.length - 1)];

  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);

  // Start where the link asked (?track=owner, ?s=slide-id).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const q = new URLSearchParams(window.location.search);
    const wantTrack = q.get("track") as TrackKey | null;
    const wantSlide = q.get("s");
    const s = wantSlide ? findSlide(wantSlide) : undefined;
    const t: TrackKey = s ? s.track : wantTrack && TRACKS.some((x) => x.key === wantTrack) ? wantTrack : "everyone";
    const i = s ? slidesForTrack(t).findIndex((x) => x.id === s.id) : 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the address once, after mount
    setTrack(t);
    setIndex(Math.max(0, i));
    setStarted(true);
    markTourSeen();
  }, []);

  useEffect(() => {
    if (!started) return;
    const url = `/tour?track=${track}&s=${slide.id}`;
    window.history.replaceState(null, "", url);
    setActive(null);
  }, [started, track, slide.id]);

  const go = useCallback(
    (delta: number) => setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + delta))),
    [slides.length]
  );

  const close = useCallback(() => {
    const ref = document.referrer;
    if (ref && new URL(ref).origin === window.location.origin && !new URL(ref).pathname.startsWith("/tour")) {
      window.history.back();
    } else {
      window.location.assign("/home");
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showAll) {
        if (e.key === "Escape") setShowAll(false);
        return;
      }
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, close, showAll]);

  const isLast = index >= slides.length - 1;
  const nextSlide = slides[index + 1];

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 128 128" aria-hidden>
            <rect width="128" height="128" rx="24" fill="#1b2c25" />
            <circle cx="40" cy="64" r="11" fill="#cb9a45" />
            <circle cx="64" cy="64" r="11" fill="#cb9a45" />
            <circle cx="88" cy="64" r="11" fill="none" stroke="#4f9c8c" strokeWidth="4" />
          </svg>
          <span className="font-display text-base md:text-lg">Getting started</span>
          <div className="hidden sm:block ml-4">
            <TrackSwitch track={track} onChange={(t) => (setTrack(t), setIndex(0))} />
          </div>
          <button
            onClick={close}
            aria-label="Close the tour"
            className="ml-auto w-10 h-10 -mr-2 rounded-lg text-muted hover:text-ink hover:bg-surface-2 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="sm:hidden px-4 pb-2.5">
          <TrackSwitch track={track} onChange={(t) => (setTrack(t), setIndex(0))} />
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-8 pt-3 md:pt-10 pb-6 grid gap-4 md:gap-14 md:grid-cols-[340px_minmax(0,1fr)] items-start">
        <div className="md:order-2 min-w-0">
          <p className="text-xs uppercase tracking-[0.14em] text-accent">
            {slide.chapter} <span className="text-muted">· step {index + 1} of {slides.length}</span>
          </p>
          <h1 className="font-display text-xl md:text-4xl mt-1 md:mt-1.5 text-balance">{slide.title}</h1>
          <p className="text-sm md:text-base text-muted mt-1.5 md:mt-3 max-w-xl">{slide.body}</p>
          <div className="hidden md:block">
            <Explain slide={slide} active={active} setActive={setActive} />
          </div>
        </div>

        <div className="md:order-1 min-w-0" onTouchStart={swipeStart} onTouchEnd={(e) => swipeEnd(e, go)}>
          {slide.screen ? (
            <Stage slide={slide} preload={nextSlide?.screen} active={active} />
          ) : (
            <TourArt kind={slide.art!} />
          )}
        </div>

        <div className="md:hidden min-w-0">
          <Explain slide={slide} active={active} setActive={setActive} />
        </div>
      </main>

      <footer className="sticky bottom-0 z-30 border-t border-line bg-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="h-1 bg-surface-2">
          <div className="h-full bg-accent transition-all" style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
        </div>
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-2.5 flex items-center gap-2">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className="px-4 py-2.5 rounded-lg border border-line text-sm disabled:opacity-30"
          >
            Back
          </button>
          <button onClick={() => setShowAll(true)} className="flex-1 text-sm text-muted hover:text-ink py-2.5 truncate">
            <span className="tabular-nums">
              {index + 1} / {slides.length}
            </span>{" "}
            · All steps
          </button>
          {isLast ? (
            <button onClick={close} className="px-5 py-2.5 rounded-lg bg-accent text-bg text-sm font-medium hover:bg-accent-hover">
              Finish
            </button>
          ) : (
            <button onClick={() => go(1)} className="px-5 py-2.5 rounded-lg bg-accent text-bg text-sm font-medium hover:bg-accent-hover">
              Next
            </button>
          )}
        </div>
      </footer>

      {showAll && (
        <AllSteps
          slides={slides}
          current={index}
          onPick={(i) => {
            setIndex(i);
            setShowAll(false);
          }}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

let touchX = 0;
let touchY = 0;
function swipeStart(e: React.TouchEvent) {
  touchX = e.touches[0].clientX;
  touchY = e.touches[0].clientY;
}
function swipeEnd(e: React.TouchEvent, go: (d: number) => void) {
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
}

function TrackSwitch({ track, onChange }: { track: TrackKey; onChange: (t: TrackKey) => void }) {
  return (
    <div role="tablist" aria-label="Tour" className="flex sm:inline-flex rounded-lg border border-line p-0.5 text-sm">
      {TRACKS.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={track === t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md whitespace-nowrap transition-colors ${
            track === t.key ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Explain({
  slide,
  active,
  setActive,
}: {
  slide: Slide;
  active: number | null;
  setActive: (i: number | null) => void;
}) {
  return (
    <>
      {slide.callouts && slide.callouts.length > 0 && (
        <ol className="mt-5 md:mt-7 space-y-3">
          {slide.callouts.map((c, i) => (
            <li key={c.label}>
              <button
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onClick={() => setActive(active === i ? null : i)}
                className="w-full text-left flex gap-3 rounded-lg -mx-2 px-2 py-1 hover:bg-surface-2/60"
              >
                <span className="w-6 h-6 shrink-0 rounded-full bg-accent text-bg text-xs font-semibold flex items-center justify-center mt-0.5 tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{c.label}</span>
                  {c.note && <span className="block text-sm text-muted">{c.note}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {slide.tip && (
        <p className="mt-5 md:mt-7 rounded-xl border border-teal/40 bg-teal/10 px-4 py-3 text-sm max-w-xl">{slide.tip}</p>
      )}
    </>
  );
}

function AllSteps({
  slides,
  current,
  onPick,
  onClose,
}: {
  slides: Slide[];
  current: number;
  onPick: (i: number) => void;
  onClose: () => void;
}) {
  const chapters: { name: string; items: { s: Slide; i: number }[] }[] = [];
  slides.forEach((s, i) => {
    const last = chapters[chapters.length - 1];
    if (last && last.name === s.chapter) last.items.push({ s, i });
    else chapters.push({ name: s.chapter, items: [{ s, i }] });
  });
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="All steps"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="font-display text-xl">All steps</h2>
          <button onClick={onClose} className="text-sm text-muted hover:text-ink">
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4">
          {chapters.map((ch) => (
            <div key={ch.name}>
              <p className="text-xs uppercase tracking-wider text-muted mb-1">{ch.name}</p>
              <ul>
                {ch.items.map(({ s, i }) => (
                  <li key={s.id}>
                    <button
                      onClick={() => onPick(i)}
                      className={`w-full text-left flex gap-3 px-2 py-2 rounded-lg text-sm ${
                        i === current ? "bg-accent/15 text-accent" : "hover:bg-surface-2"
                      }`}
                    >
                      <span className="w-6 text-right tabular-nums text-muted">{i + 1}</span>
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The phone with the live screen and its callouts

const HEADER_SPACE = 60;
const MENU_SPACE = 96;

function fixedInside(el: HTMLElement, win: Window) {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    if (win.getComputedStyle(n).position === "fixed") return true;
  }
  return false;
}

function scrollParent(el: HTMLElement, win: Window): HTMLElement | null {
  for (let n = el.parentElement; n && n !== win.document.body; n = n.parentElement) {
    const o = win.getComputedStyle(n).overflowY;
    if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight + 2) return n;
  }
  return null;
}

function Stage({ slide, preload, active }: { slide: Slide; preload?: ScreenId; active: number | null }) {
  const screen = slide.screen!;
  const wrapRef = useRef<HTMLDivElement>(null);
  const frames = useRef<Record<string, HTMLIFrameElement | null>>({});
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [failed, setFailed] = useState(false);
  const scale = width / SCREEN_W;
  const height = SCREEN_H * scale;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.data?.type !== "pingpath:tour-ready") return;
      setReady((r) => ({ ...r, [e.data.id]: true }));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const mounted = useMemo(() => Array.from(new Set([screen, preload].filter(Boolean))) as ScreenId[], [screen, preload]);

  const measure = useCallback(() => {
    const frame = frames.current[screen];
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!frame || !win || !doc || doc.documentElement.dataset.tourReady !== "1") return;
    setBoxes(
      (slide.callouts || []).map((c) => {
        const el = findTarget(doc, c.at);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, width: r.width, height: r.height };
      })
    );
  }, [screen, slide]);

  // Scroll the screen so this step's callouts are in view, then place them.
  useEffect(() => {
    setBoxes([]);
    if (!ready[screen]) return;
    const frame = frames.current[screen];
    const win = frame?.contentWindow;
    const doc = frame?.contentDocument;
    if (!frame || !win || !doc) return;
    if (win.location.pathname !== screenUrl(screen)) {
      setFailed(true);
      return;
    }
    setFailed(false);

    const els = (slide.callouts || []).map((c) => findTarget(doc, c.at)).filter((e): e is HTMLElement => Boolean(e));
    for (const el of els) {
      const box = scrollParent(el, win);
      if (!box) continue;
      const b = box.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (r.top < b.top || r.bottom > b.bottom) box.scrollTop += r.top - b.top - 24;
    }
    const inFlow = els.filter((el) => !fixedInside(el, win));
    let y = 0;
    if (!slide.top && inFlow.length) {
      const rects = inFlow.map((el) => el.getBoundingClientRect());
      const top = Math.min(...rects.map((r) => r.top)) + win.scrollY;
      const bottom = Math.max(...rects.map((r) => r.bottom)) + win.scrollY;
      const room = SCREEN_H - HEADER_SPACE - MENU_SPACE;
      y = bottom - top <= room ? top - HEADER_SPACE - (room - (bottom - top)) / 2 : top - HEADER_SPACE - 12;
      const max = doc.documentElement.scrollHeight - SCREEN_H;
      y = Math.max(0, Math.min(max, y));
    }
    win.scrollTo({ top: y, behavior: Math.abs(win.scrollY - y) < 900 ? "smooth" : "instant" });

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    win.addEventListener("scroll", onScroll, { passive: true });
    const timers = [60, 350, 700].map((ms) => setTimeout(measure, ms));
    return () => {
      win.removeEventListener("scroll", onScroll);
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
  }, [screen, slide, ready, measure]);

  // Place numbered badges at each element's top-left, nudging apart any that collide.
  const placed = useMemo(() => {
    const out: { ring: Box; badge: { x: number; y: number } | null }[] = [];
    const taken: { x: number; y: number }[] = [];
    boxes.forEach((b) => {
      if (!b) return out.push({ ring: null, badge: null });
      const left = b.left * scale - 4;
      const top = b.top * scale - 4;
      const right = (b.left + b.width) * scale + 4;
      const bottom = (b.top + b.height) * scale + 4;
      if (bottom < 4 || top > height - 4) return out.push({ ring: null, badge: null });
      const ring = {
        left: Math.max(1, left),
        top: Math.max(1, top),
        width: Math.min(width - 1, right) - Math.max(1, left),
        height: Math.min(height - 1, bottom) - Math.max(1, top),
      };
      // Small targets (icons) get their number beside them rather than on top.
      const small = ring.width < 34 && ring.height < 34;
      let x = Math.min(width - 24, Math.max(2, small ? ring.left - 25 : ring.left - 10));
      const y = Math.min(height - 24, Math.max(2, small ? ring.top + ring.height / 2 - 11 : ring.top - 10));
      while (taken.some((t) => Math.abs(t.x - x) < 22 && Math.abs(t.y - y) < 22)) x += 24;
      taken.push({ x, y });
      out.push({ ring, badge: { x, y } });
    });
    return out;
  }, [boxes, scale, width, height]);

  const isReady = ready[screen] && !failed;

  return (
    <figure className="mx-auto w-[min(74vw,290px)] md:w-full">
      <div className="rounded-[2.1rem] border-[6px] border-[#0b1411] bg-[#0b1411] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] ring-1 ring-line">
        <div
          ref={wrapRef}
          className="relative overflow-hidden rounded-[1.65rem] bg-bg"
          style={{ height: height || undefined, aspectRatio: height ? undefined : `${SCREEN_W} / ${SCREEN_H}` }}
        >
          {width > 0 &&
            mounted.map((id) => (
              <iframe
                key={id}
                ref={(el) => {
                  frames.current[id] = el;
                }}
                src={screenUrl(id)}
                title={id === screen ? `Sample screen: ${slide.title}` : "Next sample screen"}
                tabIndex={-1}
                aria-hidden
                onLoad={() => {
                  setReady((r) => ({ ...r, [id]: frames.current[id]?.contentDocument?.documentElement.dataset.tourReady === "1" || r[id] || false }));
                }}
                className="absolute top-0 left-0 border-0 origin-top-left pointer-events-none"
                style={{
                  width: SCREEN_W,
                  height: SCREEN_H,
                  transform: `scale(${scale})`,
                  visibility: id === screen ? "visible" : "hidden",
                }}
              />
            ))}

          <div
            className="absolute inset-0 pointer-events-none"
            aria-hidden
            data-tour-expected={(slide.callouts || []).length}
            data-tour-placed={isReady ? placed.filter((p) => p.badge).length : -1}
          >
            {isReady &&
              placed.map((p, i) =>
                p.ring ? (
                  <div
                    key={`r${i}`}
                    className="absolute rounded-[10px] border-2 border-accent transition-all duration-200"
                    style={{
                      ...p.ring,
                      opacity: active === null || active === i ? 1 : 0.25,
                      boxShadow: active === i ? "0 0 0 4px rgba(203,154,69,0.35)" : "0 0 0 3px rgba(18,33,28,0.55)",
                    }}
                  />
                ) : null
              )}
            {isReady &&
              placed.map((p, i) =>
                p.badge ? (
                  <span
                    key={`b${i}`}
                    className="absolute w-[22px] h-[22px] rounded-full bg-accent text-bg text-[11px] font-semibold flex items-center justify-center ring-2 ring-bg shadow transition-all duration-200 tabular-nums"
                    style={{ left: p.badge.x, top: p.badge.y, opacity: active === null || active === i ? 1 : 0.35 }}
                  >
                    {i + 1}
                  </span>
                ) : null
              )}
          </div>

          {!isReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg text-sm text-muted">
              {failed ? (
                <p className="px-6 text-center">Sign in again to see the sample screens.</p>
              ) : (
                <>
                  <span className="w-6 h-6 rounded-full border-2 border-line border-t-accent animate-spin" />
                  Loading the screen…
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <figcaption className="text-center text-[11px] text-muted mt-2.5">Live screen with sample people</figcaption>
    </figure>
  );
}

