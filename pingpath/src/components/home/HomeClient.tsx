"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CalendarFeed, Contact, Occasion, OccasionKind } from "@/lib/types";
import { OCCASION_LABEL } from "@/lib/types";
import {
  MONTH_NAMES,
  MONTH_SHORT,
  WEEKDAY_SHORT,
  addDays,
  daysBetween,
  daysInMonth,
  formatMonthDay,
  holidaysForYear,
  milestone,
  nextOccurrence,
  occasionTypeLabel,
  occurrenceInYear,
  relativeDay,
  startOfDay,
  suggestContacts,
} from "@/lib/occasions";
import { linkOccasion, setOccasionDismissed, syncCalendarFeeds, unmarkWished } from "@/app/(app)/home/actions";
import WishSheet from "@/components/home/WishSheet";
import LinkPicker from "@/components/home/LinkPicker";
import QuickAddModal from "@/components/home/QuickAddModal";

export type PickerContact = { id: string; full_name: string; nickname: string | null; phone: string | null };

type Item =
  | { type: "occasion"; key: string; date: Date; occ: Occasion }
  | { type: "holiday"; key: string; date: Date; name: string };

const STALE_MS = 6 * 60 * 60 * 1000;

export default function HomeClient({
  occasions,
  contacts,
  feeds,
}: {
  occasions: Occasion[];
  contacts: PickerContact[];
  feeds: CalendarFeed[];
}) {
  const router = useRouter();
  // Everything date-relative waits for the viewer's own clock (the server runs in UTC).
  const [today, setToday] = useState<Date | null>(null);
  const [tab, setTab] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState<{ y: number; m: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [wish, setWish] = useState<{ occ: Occasion; contact: Contact; year: number } | null>(null);
  const [linking, setLinking] = useState<Occasion | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ from: Occasion | null } | null>(null);
  const [toast, setToast] = useState<{ text: string; href?: string } | null>(null);

  const [syncing, startSync] = useTransition();
  const [syncNote, setSyncNote] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startAction] = useTransition();
  const [showAllUnlinked, setShowAllUnlinked] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);

  useEffect(() => {
    const t = startOfDay(new Date());
    setToday(t);
    setCursor({ y: t.getFullYear(), m: t.getMonth() });
  }, []);

  // Keep the calendar fresh without anyone having to remember to press sync.
  useEffect(() => {
    const stale = feeds.some(
      (f) => !f.last_synced_at || Date.now() - new Date(f.last_synced_at).getTime() > STALE_MS
    );
    if (!stale) return;
    startSync(async () => {
      await syncCalendarFeeds();
      router.refresh();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  /** Not dismissed, and a hand-typed date hides behind the calendar one for the same person. */
  const active = useMemo(() => {
    const calendarLinked = new Set(
      occasions.filter((o) => o.source === "calendar" && o.contact_id).map((o) => `${o.contact_id}|${o.kind}`)
    );
    return occasions.filter(
      (o) =>
        !o.dismissed &&
        !(
          o.source === "manual" &&
          (!o.contact_id || (o.kind !== "other" && calendarLinked.has(`${o.contact_id}|${o.kind}`)))
        )
    );
  }, [occasions]);

  function itemsBetween(start: Date, end: Date): Item[] {
    const out: Item[] = [];
    const inRange = (d: Date) => daysBetween(start, d) >= 0 && daysBetween(d, end) >= 0;
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      for (const occ of active) {
        const d = occurrenceInYear(occ.month, occ.day, y);
        if (inRange(d)) out.push({ type: "occasion", key: `${occ.id}-${y}`, date: d, occ });
      }
      for (const h of holidaysForYear(y)) {
        if (inRange(h.date)) out.push({ type: "holiday", key: h.key, date: h.date, name: h.name });
      }
    }
    const rank = (i: Item) => (i.type === "holiday" ? 2 : i.occ.contact_id ? 0 : 1);
    return out.sort((a, b) => a.date.getTime() - b.date.getTime() || rank(a) - rank(b));
  }

  const todayItems = today ? itemsBetween(today, today) : [];
  const weekItems = today ? itemsBetween(addDays(today, 1), addDays(today, 7)) : [];
  const nextUp = useMemo(() => {
    if (!today) return null;
    const upcoming = itemsBetween(addDays(today, 1), addDays(today, 366));
    return upcoming.find((i) => i.type === "occasion") || upcoming[0] || null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, active]);

  const monthStart = cursor ? new Date(cursor.y, cursor.m, 1) : null;
  const monthItems = cursor && monthStart ? itemsBetween(monthStart, new Date(cursor.y, cursor.m + 1, 0)) : [];

  const unlinked = useMemo(() => {
    const rows = active.filter((o) => o.source === "calendar" && !o.contact_id);
    const key = (o: Occasion) =>
      today ? daysBetween(today, nextOccurrence(o.month, o.day, today)) : o.month * 100 + o.day;
    return rows.sort((a, b) => key(a) - key(b));
  }, [active, today]);
  const ignored = occasions.filter((o) => o.dismissed);

  function refresh() {
    router.refresh();
  }

  function quickLink(occ: Occasion, contactId: string) {
    setBusyId(occ.id);
    startAction(async () => {
      await linkOccasion(occ.id, contactId);
      setBusyId(null);
      refresh();
    });
  }

  function dismiss(occ: Occasion, dismissed: boolean) {
    setBusyId(occ.id);
    startAction(async () => {
      await setOccasionDismissed(occ.id, dismissed);
      setBusyId(null);
      refresh();
    });
  }

  function syncNow() {
    setSyncNote("");
    startSync(async () => {
      const results = await syncCalendarFeeds();
      const failed = results.find((r) => !r.ok);
      if (failed) setSyncNote(failed.error || "Sync failed.");
      else {
        const found = results.reduce((n, r) => n + (r.result?.found || 0), 0);
        const open = results.reduce((n, r) => n + (r.result?.unlinked || 0), 0);
        setSyncNote(`Synced ${found} dates${open ? ` · ${open} not linked yet` : ""}`);
      }
      refresh();
    });
  }

  const rowHandlers: RowHandlers = {
    today,
    onWish: (occ, contact, year) => setWish({ occ, contact, year }),
    onLink: (occ) => setLinking(occ),
    onUnwish: (occ) =>
      startAction(async () => {
        await unmarkWished(occ.id);
        refresh();
      }),
  };

  const weekRange =
    today && `${formatMonthDay(addDays(today, 1).getMonth() + 1, addDays(today, 1).getDate())} – ${formatMonthDay(
      addDays(today, 7).getMonth() + 1,
      addDays(today, 7).getDate()
    )}`;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-28">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted h-4">
            {today &&
              today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="font-display text-2xl md:text-3xl">Coming up</h1>
        </div>
        <button
          onClick={() => setQuickAdd({ from: null })}
          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-accent text-bg px-3.5 py-2 text-sm font-medium hover:bg-accent-hover"
        >
          <span className="text-base leading-none">+</span> Quick add
        </button>
      </div>

      {/* Today */}
      {!today ? (
        <div className="h-24 rounded-2xl bg-surface/40 border border-line mb-6" />
      ) : todayItems.length ? (
        <section className="rounded-2xl border border-accent/40 bg-accent/[0.06] px-4 pt-3 pb-1 mb-6">
          <h2 className="font-display text-lg">Today</h2>
          <ul className="divide-y divide-line">
            {todayItems.map((item) => (
              <ItemRow key={item.key} item={item} h={rowHandlers} prominent />
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl border border-line bg-surface/40 px-4 py-3.5 mb-6">
          <p className="text-sm">Nothing today.</p>
          {nextUp && (
            <p className="text-sm text-muted mt-0.5">
              Next up: <span className="text-ink">{itemTitle(nextUp)}</span>
              {nextUp.type === "occasion" ? ` — ${occasionTypeLabel(nextUp.occ).toLowerCase()}` : ""},{" "}
              {WEEKDAY_SHORT[nextUp.date.getDay()]} {MONTH_SHORT[nextUp.date.getMonth()]} {nextUp.date.getDate()} (
              {relativeDay(daysBetween(today, nextUp.date)).toLowerCase()})
            </p>
          )}
        </section>
      )}

      {/* Week / Month */}
      <div role="tablist" aria-label="Range" className="inline-flex rounded-lg border border-line p-0.5 mb-4 text-sm">
        {(["week", "month"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-1.5 rounded-md transition-colors ${
              tab === t ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t === "week" ? "This week" : "Month"}
            {t === "week" && today && weekItems.length > 0 && (
              <span className="ml-1.5 text-xs text-accent tabular-nums">{weekItems.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "week" && today && (
        <section>
          <p className="text-xs text-muted mb-2">Next 7 days · {weekRange}</p>
          {weekItems.length ? (
            <DayGroups items={weekItems} h={rowHandlers} />
          ) : (
            <p className="text-sm text-muted rounded-xl border border-line px-4 py-3">Nothing in the next 7 days.</p>
          )}
        </section>
      )}

      {tab === "month" && today && cursor && (
        <section>
          <MonthGrid
            cursor={cursor}
            today={today}
            items={monthItems}
            selectedDay={selectedDay}
            onSelect={(d) => setSelectedDay((cur) => (cur === d ? null : d))}
            onMove={(delta) => {
              setSelectedDay(null);
              setCursor((c) => {
                if (!c) return c;
                const d = new Date(c.y, c.m + delta, 1);
                return { y: d.getFullYear(), m: d.getMonth() };
              });
            }}
            onToday={() => {
              setSelectedDay(today.getDate());
              setCursor({ y: today.getFullYear(), m: today.getMonth() });
            }}
          />
          <div className="mt-4">
            {selectedDay !== null && (
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted">
                  {MONTH_NAMES[cursor.m]} {selectedDay}
                </p>
                <button onClick={() => setSelectedDay(null)} className="text-xs text-accent">
                  Show whole month
                </button>
              </div>
            )}
            {(() => {
              const shown =
                selectedDay === null ? monthItems : monthItems.filter((i) => i.date.getDate() === selectedDay);
              return shown.length ? (
                <DayGroups items={shown} h={rowHandlers} />
              ) : (
                <p className="text-sm text-muted rounded-xl border border-line px-4 py-3">
                  {selectedDay === null ? "Nothing this month." : "Nothing on this day."}
                </p>
              );
            })()}
          </div>
        </section>
      )}

      {/* Calendar entries that still need a contact */}
      {unlinked.length > 0 && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-lg">From your calendar, not linked yet</h2>
            <span className="text-xs text-muted tabular-nums">{unlinked.length}</span>
          </div>
          <p className="text-xs text-muted mb-3">
            Link each one to a contact so wishes go out in one tap. Exact name matches were linked for you.
          </p>
          <ul className="rounded-xl border border-line divide-y divide-line bg-surface/40">
            {(showAllUnlinked ? unlinked : unlinked.slice(0, 6)).map((occ) => {
              const suggestions = suggestContacts(occ.label, contacts, 2);
              const busy = busyId === occ.id;
              const next = today ? nextOccurrence(occ.month, occ.day, today) : null;
              return (
                <li key={occ.id} className={`px-3 py-3 ${busy ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{occ.label || "Untitled"}</p>
                      <p className="text-xs text-muted">
                        {OCCASION_LABEL[occ.kind]} · {formatMonthDay(occ.month, occ.day, occ.year)}
                        {today && next && ` · ${relativeDay(daysBetween(today, next)).toLowerCase()}`}
                      </p>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => dismiss(occ, true)}
                      className="text-xs text-muted hover:text-ink shrink-0"
                    >
                      Ignore
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {suggestions.map((c) => (
                      <button
                        key={c.id}
                        disabled={busy}
                        onClick={() => quickLink(occ, c.id)}
                        className="text-xs px-2.5 py-1 rounded-full border border-accent/50 text-accent hover:bg-accent/10"
                      >
                        Link to {c.full_name}
                      </button>
                    ))}
                    <button
                      disabled={busy}
                      onClick={() => setLinking(occ)}
                      className="text-xs px-2.5 py-1 rounded-full border border-line text-muted hover:text-ink"
                    >
                      Choose contact…
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => setQuickAdd({ from: occ })}
                      className="text-xs px-2.5 py-1 rounded-full border border-line text-muted hover:text-ink"
                    >
                      + Add as contact
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {unlinked.length > 6 && (
            <button onClick={() => setShowAllUnlinked((v) => !v)} className="text-xs text-accent mt-2">
              {showAllUnlinked ? "Show fewer" : `Show all ${unlinked.length}`}
            </button>
          )}
        </section>
      )}

      {ignored.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowIgnored((v) => !v)} className="text-xs text-muted hover:text-ink">
            {showIgnored ? "Hide ignored" : `${ignored.length} ignored`}
          </button>
          {showIgnored && (
            <ul className="mt-2 rounded-xl border border-line divide-y divide-line">
              {ignored.map((occ) => (
                <li key={occ.id} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted">
                    {occ.label} · {formatMonthDay(occ.month, occ.day)}
                  </span>
                  <button
                    disabled={busyId === occ.id}
                    onClick={() => dismiss(occ, false)}
                    className="text-xs text-accent shrink-0"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Calendar connection */}
      {feeds.length === 0 ? (
        <section className="mt-10 rounded-xl border border-dashed border-line p-4">
          <p className="text-sm font-medium">Bring in your Google birthdays calendar</p>
          <p className="text-xs text-muted mt-1">
            Paste its private iCal link once. PingPath keeps it in sync and matches the names to your contacts.
          </p>
          <Link href="/settings/calendar" className="inline-block mt-3 text-sm text-accent hover:text-accent-hover">
            Connect calendar →
          </Link>
        </section>
      ) : (
        <section className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>
            Google Calendar ·{" "}
            {syncing
              ? "syncing…"
              : !today
                ? ""
                : feeds[0].last_synced_at
                ? `synced ${timeAgo(feeds[0].last_synced_at)}`
                : "not synced yet"}
          </span>
          <button onClick={syncNow} disabled={syncing} className="text-accent hover:text-accent-hover disabled:opacity-50">
            Sync now
          </button>
          <Link href="/settings/calendar" className="hover:text-ink">
            Settings
          </Link>
          {syncNote && <span className="w-full text-muted">{syncNote}</span>}
          {!syncNote && feeds.some((f) => f.last_error) && (
            <span className="w-full text-rust">{feeds.find((f) => f.last_error)?.last_error}</span>
          )}
        </section>
      )}

      {/* Sheets */}
      {wish && (
        <WishSheet
          occasion={wish.occ}
          contact={wish.contact}
          year={wish.year}
          onClose={() => setWish(null)}
          onSent={refresh}
        />
      )}
      {linking && (
        <LinkPicker
          occasion={linking}
          contacts={contacts}
          onClose={() => setLinking(null)}
          onLinked={() => {
            setLinking(null);
            refresh();
          }}
          onAddNew={() => {
            setQuickAdd({ from: linking });
            setLinking(null);
          }}
        />
      )}
      {quickAdd && (
        <QuickAddModal
          from={quickAdd.from}
          onClose={() => setQuickAdd(null)}
          onCreated={(c) => {
            setQuickAdd(null);
            setToast({ text: `Added ${c.name}`, href: `/contacts/${c.id}` });
            refresh();
          }}
        />
      )}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-50 rounded-full bg-surface-2 border border-line px-4 py-2 text-sm shadow-lg flex items-center gap-3">
          {toast.text}
          {toast.href && (
            <Link href={toast.href} className="text-accent">
              Open
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

type RowHandlers = {
  today: Date | null;
  onWish: (occ: Occasion, contact: Contact, year: number) => void;
  onLink: (occ: Occasion) => void;
  onUnwish: (occ: Occasion) => void;
};

function itemTitle(item: Item): string {
  if (item.type === "holiday") return item.name;
  const { occ } = item;
  // A couple's anniversary reads better by the calendar's own wording ("Mom & Dad").
  if (occ.kind === "anniversary" && occ.label) return occ.label;
  return occ.contact?.full_name || occ.label || "Unnamed";
}

function DayGroups({ items, h }: { items: Item[]; h: RowHandlers }) {
  const groups: { date: Date; items: Item[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && daysBetween(last.date, item.date) === 0) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.date.toISOString()}>
          <p className="text-xs text-muted mb-1">
            {WEEKDAY_SHORT[g.date.getDay()]}, {MONTH_SHORT[g.date.getMonth()]} {g.date.getDate()}
            {h.today && <span> · {relativeDay(daysBetween(h.today, g.date))}</span>}
          </p>
          <ul className="rounded-xl border border-line bg-surface/40 divide-y divide-line px-3">
            {g.items.map((item) => (
              <ItemRow key={item.key} item={item} h={h} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ItemRow({ item, h, prominent }: { item: Item; h: RowHandlers; prominent?: boolean }) {
  if (item.type === "holiday") {
    return (
      <li className="flex items-center gap-3 py-2.5">
        <KindIcon kind="holiday" />
        <div className="min-w-0 flex-1">
          <p className="text-sm truncate">{item.name}</p>
          <p className="text-xs text-muted">Holiday</p>
        </div>
      </li>
    );
  }

  const { occ, date } = item;
  const contact = occ.contact || null;
  const year = date.getFullYear();
  const days = h.today ? daysBetween(h.today, date) : null;
  const wished = occ.last_wished_year === year;
  const canWish = contact && contact.status !== "do_not_contact" && days !== null && days <= 1;
  const mark = milestone(occ.kind, occ.year, date);
  const sub = [
    // "41st anniversary" already says what it is; "Birthday · Turns 32" needs both.
    occ.kind === "anniversary" && mark ? mark : occasionTypeLabel(occ),
    occ.kind === "anniversary" ? null : mark,
    !contact ? "Not linked to a contact" : contact.status === "do_not_contact" ? "Do not contact" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className={`flex items-center gap-3 ${prominent ? "py-3" : "py-2.5"}`}>
      <KindIcon kind={occ.kind} />
      <div className="min-w-0 flex-1">
        <p className={`truncate ${prominent ? "text-base font-medium" : "text-sm font-medium"}`}>
          {contact ? (
            <Link href={`/contacts/${contact.id}`} className="hover:text-accent">
              {itemTitle(item)}
            </Link>
          ) : (
            itemTitle(item)
          )}
        </p>
        <p className="text-xs text-muted truncate">{sub}</p>
      </div>
      {!contact ? (
        <button
          onClick={() => h.onLink(occ)}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-line text-muted hover:text-ink shrink-0"
        >
          Link
        </button>
      ) : wished ? (
        <button
          onClick={() => h.onUnwish(occ)}
          title="Marked as sent — tap to undo"
          className="text-xs px-2.5 py-1.5 rounded-lg border border-moss/40 bg-moss/10 text-moss shrink-0"
        >
          Wished ✓
        </button>
      ) : canWish ? (
        <button
          onClick={() => h.onWish(occ, contact, year)}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 ${
            prominent ? "bg-accent text-bg hover:bg-accent-hover" : "border border-accent/50 text-accent hover:bg-accent/10"
          }`}
        >
          {days !== null && days < 0 ? "Belated wishes" : "Send wishes"}
        </button>
      ) : null}
    </li>
  );
}

function KindIcon({ kind }: { kind: OccasionKind | "holiday" }) {
  const tone =
    kind === "birthday"
      ? "text-accent"
      : kind === "anniversary"
        ? "text-teal"
        : kind === "holiday"
          ? "text-moss"
          : "text-rust";
  return (
    <span
      className={`w-8 h-8 rounded-full bg-surface-2 border border-line flex items-center justify-center shrink-0 ${tone}`}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {kind === "birthday" && (
          <>
            <path d="M4 20h16M5.5 20v-6.5A1.5 1.5 0 0 1 7 12h10a1.5 1.5 0 0 1 1.5 1.5V20" />
            <path d="M5.5 16c1.2 0 1.7-1 3.2-1s2 1 3.3 1 1.8-1 3.3-1 2 1 3.2 1" />
            <path d="M12 12V9" />
            <path d="M12 6.5c.9-.9.9-1.8 0-2.7-.9.9-.9 1.8 0 2.7Z" />
          </>
        )}
        {kind === "anniversary" && (
          <>
            <circle cx="9" cy="14" r="5" />
            <circle cx="15" cy="14" r="5" />
            <path d="M10 6l2-2.5L14 6" />
          </>
        )}
        {kind === "holiday" && <path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4.1-4 5.7-.8z" />}
        {kind === "other" && (
          <>
            <rect x="4.5" y="6" width="15" height="13.5" rx="2" />
            <path d="M4.5 10.5h15M9 4v3.5M15 4v3.5" />
            <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
          </>
        )}
      </svg>
    </span>
  );
}

function MonthGrid({
  cursor,
  today,
  items,
  selectedDay,
  onSelect,
  onMove,
  onToday,
}: {
  cursor: { y: number; m: number };
  today: Date;
  items: Item[];
  selectedDay: number | null;
  onSelect: (day: number) => void;
  onMove: (delta: number) => void;
  onToday: () => void;
}) {
  const pad = new Date(cursor.y, cursor.m, 1).getDay();
  const total = daysInMonth(cursor.y, cursor.m + 1);
  const byDay = new Map<number, Item[]>();
  for (const i of items) {
    const d = i.date.getDate();
    byDay.set(d, [...(byDay.get(d) || []), i]);
  }
  const isCurrentMonth = today.getFullYear() === cursor.y && today.getMonth() === cursor.m;

  const dotClass = (i: Item) =>
    i.type === "holiday"
      ? "bg-moss"
      : i.occ.kind === "birthday"
        ? "bg-accent"
        : i.occ.kind === "anniversary"
          ? "bg-teal"
          : "bg-rust";

  return (
    <div className="rounded-xl border border-line bg-surface/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => onMove(-1)} aria-label="Previous month" className="w-9 h-9 rounded-lg hover:bg-surface-2 text-muted">
          ‹
        </button>
        <div className="text-center">
          <p className="font-display text-base">
            {MONTH_NAMES[cursor.m]} {cursor.y}
          </p>
          {!isCurrentMonth && (
            <button onClick={onToday} className="text-[11px] text-accent">
              Back to today
            </button>
          )}
        </div>
        <button onClick={() => onMove(1)} aria-label="Next month" className="w-9 h-9 rounded-lg hover:bg-surface-2 text-muted">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-muted mb-1">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d}>{d.slice(0, 2)}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: pad }).map((_, i) => (
          <span key={`pad-${i}`} />
        ))}
        {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
          const dayItems = byDay.get(d) || [];
          const isToday = isCurrentMonth && today.getDate() === d;
          const selected = selectedDay === d;
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              aria-label={`${MONTH_NAMES[cursor.m]} ${d}${dayItems.length ? `, ${dayItems.length} items` : ""}`}
              aria-pressed={selected}
              className={`relative flex flex-col items-center justify-start pt-1.5 h-11 rounded-lg text-sm tabular-nums transition-colors ${
                selected ? "bg-accent text-bg" : isToday ? "bg-accent/15 text-accent" : "hover:bg-surface-2"
              }`}
            >
              {d}
              <span className="flex gap-0.5 mt-1">
                {dayItems.slice(0, 3).map((i) => (
                  <span key={i.key} className={`w-1.5 h-1.5 rounded-full ${selected ? "bg-bg" : dotClass(i)}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Birthday</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-teal" />Anniversary</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rust" />Special date</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-moss" />Holiday</span>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
