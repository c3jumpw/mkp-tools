"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { markTourSeen, readTourMemory } from "@/lib/changelog";

/**
 * The welcome card at the top of Home for brand-new boards. (What's new after
 * an update is a separate popup: src/components/updates/WhatsNew.tsx.)
 */
export default function TourPrompt({ isNew }: { isNew: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads per-device storage after mount
    if (isNew && !readTourMemory().welcomed) setShow(true);
  }, [isNew]);

  if (!show) return null;

  function dismiss() {
    markTourSeen();
    setShow(false);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 pt-4 md:pt-8 -mb-2 md:-mb-4">
      <section
        data-tour-prompt
        className="rounded-2xl border border-accent/40 bg-accent/[0.06] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3"
      >
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg">New to PingPath?</p>
          <p className="text-sm text-muted">
            Take the tour: every screen, step by step, with sample people. About five minutes.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/tour"
            onClick={() => markTourSeen()}
            className="tap-target flex items-center rounded-lg bg-accent text-bg px-3.5 py-2 text-sm font-medium hover:bg-accent-hover"
          >
            Start the tour
          </Link>
          <button onClick={dismiss} className="rounded-lg border border-line px-3.5 py-2 text-sm text-muted hover:text-ink">
            Not now
          </button>
        </div>
      </section>
    </div>
  );
}
