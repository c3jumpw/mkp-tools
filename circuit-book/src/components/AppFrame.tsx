"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { onPendingChange } from "@/lib/outbox";

const TABS = [
  { href: "/today", label: "Today", icon: TodayIcon },
  { href: "/library", label: "Library", icon: LibraryIcon },
  { href: "/routines", label: "Routines", icon: RoutinesIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
];

/**
 * The shell every screen sits in, except session mode — a running session takes
 * the whole display so nothing competes with the station in front of you.
 */
export default function AppFrame({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  // No point offering the guide from inside the guide.
  const showGuide = !pathname.startsWith("/guide");

  return (
    <div className="flex min-h-dvh flex-col">
      {title ? (
        <header className="pad-safe-t sticky top-0 z-30 border-b border-line-soft bg-base/92 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 py-3">
            <h1 className="ex-tight text-[1.6rem] leading-none font-bold">{title}</h1>
            <div className="flex items-center gap-2">
              {showGuide && <GuideLink />}
              {action}
            </div>
          </div>
        </header>
      ) : (
        showGuide && <GuideLink corner />
      )}

      <main className="mx-auto w-full max-w-lg flex-1 pb-28">{children}</main>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/95 pad-safe-b backdrop-blur-sm"
      >
        <div className="mx-auto flex w-full max-w-lg">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[0.7rem] font-medium transition-colors ${
                  active ? "text-lime" : "text-faint"
                }`}
              >
                <Icon active={active} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <SyncBadge />
    </div>
  );
}

/**
 * A quiet way into the in-app guide from any main screen. Inline next to the
 * title when there is a header (Library, Routines, History); a small fixed
 * corner button on Today, which draws its own header with no room for one.
 */
function GuideLink({ corner = false }: { corner?: boolean }) {
  return (
    <Link
      href="/guide"
      aria-label="Guide"
      className={
        corner
          ? "pad-safe-t fixed top-3 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-base/80 text-muted backdrop-blur-sm active:bg-raise"
          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted active:bg-raise"
      }
    >
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M7.8 7.7a2.2 2.2 0 1 1 3.3 2.1c-.7.4-1.1.8-1.1 1.6v.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="14.4" r="0.9" fill="currentColor" />
      </svg>
    </Link>
  );
}

/**
 * Only appears when there is something queued. Silence means everything the
 * user ticked off is already saved.
 */
function SyncBadge() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const stop = onPendingChange(setPending);
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      stop();
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (pending === 0) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+68px)] z-40 flex justify-center px-4"
    >
      <span className="rounded-full border border-line bg-raise px-3.5 py-1.5 text-xs font-medium text-muted shadow-lg">
        {online
          ? `Saving ${pending} ${pending === 1 ? "change" : "changes"}`
          : `${pending} ${pending === 1 ? "change" : "changes"} waiting for a signal`}
      </span>
    </div>
  );
}

/* --- Icons. Simple line shapes; the active state is carried by colour. --- */

function TodayIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      {active && <rect x="7" y="12.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" />}
    </svg>
  );
}

function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="5" height="15" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect
        x="10.5"
        y="4.5"
        width="5"
        height="15"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.7"
        fill={active ? "currentColor" : "none"}
      />
      <rect x="17.5" y="4.5" width="3" height="15" rx="1.4" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function RoutinesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="5.5" cy="17.5" r="2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="5.5" cy="12" r="2" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M10 6.5h10M10 12h10M10 17.5h10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.5V12l3 2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {active && <circle cx="12" cy="12" r="1.6" fill="currentColor" />}
    </svg>
  );
}
