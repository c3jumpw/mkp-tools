"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FigureName } from "@/app/guide/figures";
import { AudienceTag, KindBadge, formatEntryDate, type Kind } from "@/components/ChangeBits";
import { Focus } from "@/components/GuideParts";
import { Button } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { TOUR_SEEN_KEY } from "@/lib/tour";
import { SEEN_LOCAL_KEY, SEEN_META_KEY } from "@/lib/whats-new";

type Entry = {
  seq: number;
  date: string;
  kind: Kind;
  audience: "everyone" | "admins";
  title: string;
  summary: string;
  details: string[];
  link: { href: string; label: string } | null;
  figure: FigureName | null;
};

type Data = { user: string; latest: number; entries: Entry[] };

/**
 * The "What's new" pop-up on Today. Shows, once, the changes made since this
 * person last dismissed it, limited by the server to the ones their role can
 * see. Closing it in any way counts as seen, on every device they use.
 */
export default function WhatsNew() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A first visit gets the tour instead; this waits for the next one.
    try {
      if (localStorage.getItem(TOUR_SEEN_KEY) === null) return;
    } catch {
      /* storage blocked: carry on */
    }
    let active = true;
    fetch("/api/whats-new", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Data>) : null))
      .then((d) => {
        if (!active || !d?.entries?.length) return;
        let local = 0;
        try {
          const [u, s] = (localStorage.getItem(SEEN_LOCAL_KEY) ?? "").split(":");
          if (u === d.user) local = Number(s) || 0;
        } catch {
          /* ignore */
        }
        const entries = d.entries.filter((e) => e.seq > local);
        if (entries.length) setData({ ...d, entries });
      })
      .catch(() => {
        /* offline: try again next time */
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function dismiss(then?: string) {
    if (!data) return;
    try {
      localStorage.setItem(SEEN_LOCAL_KEY, `${data.user}:${data.latest}`);
    } catch {
      /* ignore */
    }
    supabaseBrowser()
      .auth.updateUser({ data: { [SEEN_META_KEY]: data.latest } })
      .catch(() => {
        /* the device copy covers this one; the account catches up next time */
      });
    setData(null);
    if (then) router.push(then);
  }

  if (!data) return null;
  const n = data.entries.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button type="button" aria-label="Close" onClick={() => dismiss()} className="absolute inset-0 bg-black/70" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        // Focused so keyboard and screen reader users land in it; no ring, it's the whole sheet.
        style={{ outline: "none" }}
        className="relative mx-auto flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border-t border-line bg-base"
      >
        <header className="relative overflow-hidden border-b border-line-soft px-4 pt-5 pb-4">
          {/* A quiet burst behind the title, in the callout blue. */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -top-6 -right-6 text-[#5ab0ff] opacity-25"
            width="150"
            height="150"
            viewBox="0 0 150 150"
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={75 + Math.cos(a) * 26}
                  y1={75 + Math.sin(a) * 26}
                  x2={75 + Math.cos(a) * (i % 2 ? 50 : 66)}
                  y2={75 + Math.sin(a) * (i % 2 ? 50 : 66)}
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#8cc8ff] uppercase">Since you were last here</p>
              <h2 id="whats-new-title" className="ex-tight mt-1 text-[1.75rem] leading-none font-bold">
                What&rsquo;s new
              </h2>
              <p className="mt-2 text-sm text-muted">
                {n === 1 ? "One update" : `${n} updates`} to Circuit Book.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss()}
              aria-label="Close"
              className="-mt-1 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-raise"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        <ol className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {data.entries.map((e) => (
            <li key={e.seq}>
              <article className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <KindBadge kind={e.kind} />
                  <AudienceTag audience={e.audience} />
                  <span className="ml-auto text-xs text-faint">{formatEntryDate(e.date, false)}</span>
                </div>
                <h3 className="ex mt-2.5 text-[1.1rem] leading-snug font-bold text-chalk">{e.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{e.summary}</p>
                {e.details.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5 text-sm leading-snug text-muted">
                    {e.details.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-faint" aria-hidden="true" />
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {e.figure && (
                  <div className="mt-3.5">
                    <Focus name={e.figure} />
                  </div>
                )}
                {e.link && (
                  <button
                    type="button"
                    onClick={() => dismiss(e.link!.href)}
                    className="mt-3.5 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-3.5 text-sm font-semibold text-chalk active:bg-raise"
                  >
                    {e.link.label}
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </article>
            </li>
          ))}
        </ol>

        <div className="border-t border-line-soft px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
          <Button size="lg" onClick={() => dismiss()}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
