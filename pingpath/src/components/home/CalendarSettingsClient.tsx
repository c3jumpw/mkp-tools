"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CalendarFeed } from "@/lib/types";
import { addCalendarFeed, removeCalendarFeed, syncCalendarFeeds } from "@/app/(app)/home/actions";

export type FeedView = {
  id: string;
  name: string;
  masked: string;
  last_synced_at: string | null;
  last_error: string | null;
  last_result: CalendarFeed["last_result"];
};

export default function CalendarSettingsClient({ feeds }: { feeds: FeedView[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("Birthdays & Anniversaries");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  function add() {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await addCalendarFeed(url, name);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setUrl("");
      const r = res.result;
      setSuccess(
        `Connected. Found ${r.found} dates; ${r.linked} matched to contacts${
          r.unlinked ? `, ${r.unlinked} waiting for you on the home page` : ""
        }.`
      );
      router.refresh();
    });
  }

  function sync(id: string) {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const [r] = await syncCalendarFeeds(id);
      if (r && !r.ok) setError(r.error || "Sync failed.");
      else if (r?.result) setSuccess(`Synced ${r.result.found} dates.`);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await removeCalendarFeed(id);
      setConfirmRemove(null);
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <Link href="/settings" className="text-sm text-muted hover:text-ink">
        ← Settings
      </Link>
      <h1 className="font-display text-2xl md:text-3xl mt-3 mb-2">Calendar sync</h1>
      <p className="text-sm text-muted mb-6">
        PingPath reads your Google birthdays &amp; anniversaries calendar, matches the names to your contacts, and shows
        what&apos;s coming up on the home page. It only reads the calendar; it never changes it.
      </p>

      {feeds.length > 0 && (
        <section className="rounded-xl border border-line divide-y divide-line mb-8">
          {feeds.map((f) => (
            <div key={f.id} className="px-4 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted truncate">{f.masked}</p>
                  {f.last_result && !f.last_error && (
                    <p className="text-xs text-muted mt-1">
                      {f.last_result.found} dates · {f.last_result.linked} linked · {f.last_result.unlinked} not linked
                    </p>
                  )}
                  {f.last_error && <p className="text-xs text-rust mt-1">{f.last_error}</p>}
                </div>
                <div className="flex gap-3 shrink-0 text-xs">
                  <button onClick={() => sync(f.id)} disabled={pending} className="text-accent disabled:opacity-50">
                    Sync now
                  </button>
                  <button onClick={() => setConfirmRemove(f.id)} className="text-muted hover:text-rust">
                    Remove
                  </button>
                </div>
              </div>
              {confirmRemove === f.id && (
                <div className="mt-3 rounded-lg border border-rust/40 bg-rust/10 px-3 py-2.5 text-xs">
                  Remove this calendar? Dates imported from it are removed too. Birthdays you typed in yourself stay.
                  <div className="flex gap-3 mt-2">
                    <button onClick={() => remove(f.id)} disabled={pending} className="text-rust font-medium">
                      Remove calendar
                    </button>
                    <button onClick={() => setConfirmRemove(null)} className="text-muted">
                      Keep it
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="rounded-xl border border-line p-4 space-y-3">
        <h2 className="font-display text-lg">{feeds.length ? "Add another calendar" : "Connect your calendar"}</h2>
        <ol className="text-sm text-muted space-y-1.5 list-decimal pl-5">
          <li>
            Open{" "}
            <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noreferrer" className="text-accent">
              Google Calendar settings
            </a>{" "}
            on a computer (the phone app doesn&apos;t show this setting).
          </li>
          <li>Under “Settings for my calendars” on the left, click your birthdays &amp; anniversaries calendar.</li>
          <li>Scroll to “Integrate calendar” and copy the “Secret address in iCal format”.</li>
          <li>Paste it below. Treat it like a password: anyone with it can read that calendar.</li>
        </ol>
        <div>
          <label htmlFor="feed-name" className="block text-xs text-muted mb-1">
            Name
          </label>
          <input
            id="feed-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <div>
          <label htmlFor="feed-url" className="block text-xs text-muted mb-1">
            Secret address in iCal format
          </label>
          <input
            id="feed-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        {success && (
          <p className="text-sm text-moss">
            {success}{" "}
            <Link href="/home" className="text-accent">
              Go to home →
            </Link>
          </p>
        )}
        <button
          onClick={add}
          disabled={pending || !url.trim()}
          className="text-sm px-4 py-2 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Reading calendar…" : "Connect and sync"}
        </button>
        <p className="text-xs text-muted">
          Works with any calendar that offers an iCal (.ics) link, including Apple iCloud shared calendars.
        </p>
      </section>
    </div>
  );
}
