import Link from "next/link";
import { signOut } from "@/app/(app)/actions";
import { CURRENT_RELEASE } from "@/lib/changelog";

const ROWS = [
  { href: "/tour", title: "Getting started tour", sub: "Every screen, step by step, with sample people" },
  { href: "/tour?track=whatsnew", title: "What's new", sub: `Version ${CURRENT_RELEASE.version} · ${CURRENT_RELEASE.date}` },
  { href: "/guide", title: "How to use PingPath", sub: "Illustrated guide to every screen, plus setup notes for the owner" },
  { href: "/settings/calendar", title: "Calendar sync", sub: "Bring in birthdays & anniversaries from Google Calendar" },
  { href: "/contacts/import", title: "Import contacts", sub: "Add a list from a CSV file or pasted text" },
  { href: "/contacts/duplicates", title: "Find duplicates", sub: "Review contacts that share a phone, email, or name" },
];

/** The Settings screen. Admins also get the Admin section. */
export default function SettingsMenu({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <h1 className="font-display text-2xl md:text-3xl mb-6">Settings</h1>

      {isAdmin && (
        <section aria-label="Admin" className="mb-6">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-teal mb-2 px-1">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 3.5 5.5 6.2v4.9c0 4.1 2.8 7.7 6.5 8.9 3.7-1.2 6.5-4.8 6.5-8.9V6.2L12 3.5Z" />
            </svg>
            Admin · only admins see this
          </p>
          <Link
            href="/admin"
            className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-teal/40 bg-teal/[0.08] hover:bg-teal/15 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">Change log</p>
              <p className="text-xs text-muted mt-0.5">Every update since launch, who it applies to, and a download</p>
            </div>
            <span className="text-teal">→</span>
          </Link>
        </section>
      )}

      <div className="rounded-xl border border-line divide-y divide-line overflow-hidden mb-6">
        {ROWS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="flex items-center justify-between px-4 py-3.5 hover:bg-surface-2/60 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">{r.title}</p>
              <p className="text-xs text-muted mt-0.5">{r.sub}</p>
            </div>
            <span className="text-muted">→</span>
          </Link>
        ))}
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="w-full text-left px-4 py-3.5 rounded-xl border border-line text-sm text-rust hover:bg-rust/10 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
