"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { markUpdatesSeen } from "@/app/(app)/actions";
import type { Release } from "@/lib/changelog";
import { AudienceChip, Burst, ChangeIcon, KindChip } from "@/components/updates/parts";

const CSS = `
@keyframes pp-sheet-in{from{transform:translateY(28px);opacity:0}to{transform:none;opacity:1}}
@keyframes pp-fade-in{from{opacity:0}to{opacity:1}}
@keyframes pp-rise{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
.pp-sheet{animation:pp-sheet-in .45s cubic-bezier(.2,.8,.2,1) both}
.pp-fade{animation:pp-fade-in .3s ease both}
.pp-rise{animation:pp-rise .5s cubic-bezier(.2,.8,.2,1) both}
@media (prefers-reduced-motion:reduce){.pp-sheet,.pp-fade,.pp-rise{animation:none}}
html.tour-screen .pp-sheet,html.tour-screen .pp-fade,html.tour-screen .pp-rise{animation:none}
`;

/**
 * What's new: shown the first time someone opens PingPath after an update,
 * on any device, with only the changes that apply to them. Closing it in any
 * way records that this account has seen the current version.
 */
export default function WhatsNew({
  updates,
  isAdmin,
  sample,
}: {
  /** Unseen updates, newest first, already trimmed to this person's role. */
  updates: Release[];
  isAdmin: boolean;
  /** Shown inside the tour: always open, saves nothing. */
  sample?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "open" | "closed">(sample ? "open" : "idle");
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sample || phase !== "idle") return;
    // Never over the tour's sample screens.
    if (window.self !== window.top || window.location.pathname.includes("/tour/")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depends on the browser window
    setPhase("open");
  }, [sample, phase]);

  const close = useCallback(() => {
    if (sample) return;
    setPhase("closed");
    markUpdatesSeen().catch(() => {
      // offline: it shows again next time, which is fine
    });
  }, [sample]);

  useEffect(() => {
    if (phase !== "open" || sample) return;
    panel.current?.focus();
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, sample, close]);

  if (phase !== "open" || updates.length === 0) return null;

  const newest = updates[0];
  const several = updates.length > 1;
  let n = 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-6">
      <style>{CSS}</style>
      <div className="pp-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsnew-title"
        tabIndex={-1}
        data-whatsnew
        className="pp-sheet relative w-full md:max-w-lg max-h-[88dvh] md:max-h-[84vh] flex flex-col rounded-t-[28px] md:rounded-[28px] border border-line bg-bg shadow-[0_-24px_70px_-24px_rgba(0,0,0,0.85)] outline-none overflow-hidden"
      >
        <span className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-line" aria-hidden />
        <header className="relative px-5 pt-6 pb-4 shrink-0" data-whatsnew-head>
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(110% 120% at 100% 0%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 62%), radial-gradient(80% 100% at 0% 0%, color-mix(in srgb, var(--teal) 16%, transparent), transparent 58%)",
            }}
          />
          <button
            onClick={close}
            aria-label="Close"
            className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2/80"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <div className="relative flex items-center gap-3.5 pr-8">
            <Burst />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.16em] text-accent font-medium">What&apos;s new</p>
              <h2 id="whatsnew-title" className="font-display text-[22px] leading-tight mt-0.5 text-balance">
                {several ? `${updates.length} updates since you were last here` : newest.title}
              </h2>
            </div>
          </div>
          <p className="relative text-sm text-muted mt-3">
            {several
              ? `Newest first. Version ${newest.version} arrived ${newest.date}.`
              : `Version ${newest.version} · ${newest.date}`}
          </p>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 md:px-5 pb-4 space-y-5">
          {updates.map((r) => (
            <section key={r.version} aria-label={`Version ${r.version}`}>
              {several && (
                <p className="flex items-baseline gap-2 px-1 pb-2">
                  <span className="font-mono text-[11px] rounded-md border border-line px-1.5 py-[1px] text-muted">{r.version}</span>
                  <span className="font-display text-base leading-tight">{r.title}</span>
                  <span className="text-xs text-muted ml-auto shrink-0">{r.date}</span>
                </p>
              )}
              <ul className="space-y-2.5">
                {r.changes.map((c) => (
                  <li
                    key={c.title}
                    className="pp-rise flex gap-3 rounded-2xl border border-line bg-surface/50 p-3.5"
                    style={{ animationDelay: `${140 + n++ * 70}ms` }}
                  >
                    <ChangeIcon area={c.area} kind={c.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <KindChip kind={c.kind} />
                        <span className="text-[11px] text-muted">{c.area}</span>
                        {c.audience === "admin" && <AudienceChip audience="admin" />}
                      </div>
                      <p className="font-medium leading-snug mt-1">{c.title}</p>
                      {c.detail && <p className="text-sm text-muted mt-0.5">{c.detail}</p>}
                      {c.slide && (
                        <Link
                          href={`/tour?s=${c.slide}`}
                          onClick={close}
                          className="inline-block mt-1.5 text-sm"
                        >
                          <span className="text-accent">Show me →</span>
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={close}
              className="flex items-center justify-between rounded-2xl border border-teal/40 bg-teal/10 px-4 py-3 text-sm"
            >
              <span>
                <span className="block font-medium text-teal">Full change log</span>
                <span className="block text-muted">Every update since launch, in Settings › Admin</span>
              </span>
              <span className="text-teal">→</span>
            </Link>
          )}
        </div>

        <footer className="shrink-0 grid grid-cols-2 gap-2 border-t border-line bg-surface/40 px-4 md:px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Link
            href="/tour?track=whatsnew"
            onClick={close}
            className="tap-target flex items-center justify-center rounded-xl border border-line px-4 py-2.5 text-sm hover:bg-surface-2/70"
          >
            Show me around
          </Link>
          <button
            onClick={close}
            className="rounded-xl bg-accent text-bg px-4 py-2.5 text-sm font-medium hover:bg-accent-hover"
          >
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
}
