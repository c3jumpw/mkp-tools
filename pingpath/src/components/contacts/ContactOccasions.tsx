"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Occasion } from "@/lib/types";
import {
  daysBetween,
  formatMonthDay,
  nextOccurrence,
  occasionTypeLabel,
  relativeDay,
  startOfDay,
  type SimpleDate,
} from "@/lib/occasions";
import OccasionDateInput, { isCompleteDate } from "@/components/OccasionDateInput";
import { saveSpecialDate, setContactOccasion, unlinkOccasion } from "@/app/(app)/home/actions";

/** "In 5 days" depends on the viewer's own date, so it's filled in after mount. */
function useToday() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(startOfDay(new Date())), []);
  return today;
}

const sameDate = (a: SimpleDate | null, b: SimpleDate | null) =>
  JSON.stringify(a && isCompleteDate(a) ? a : null) === JSON.stringify(b);

/** Birthday plus any number of special dates on a contact's page. */
export default function ContactOccasions({
  contactId,
  occasions,
}: {
  contactId: string;
  occasions: Occasion[];
}) {
  const [adding, setAdding] = useState(false);
  const calendarBirthday = occasions.find((o) => o.kind === "birthday" && o.source === "calendar") || null;
  const manualBirthday = occasions.find((o) => o.kind === "birthday" && o.source === "manual") || null;
  const special = occasions
    .filter((o) => o.kind !== "birthday")
    .sort((a, b) => a.month * 100 + a.day - (b.month * 100 + b.day));

  return (
    <section className="mb-6 space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label className="block text-xs text-muted">Birthday</label>
          <Link href="/home" className="text-xs text-accent hover:text-accent-hover">
            See what&apos;s coming up →
          </Link>
        </div>
        <div className="rounded-xl border border-line">
          {calendarBirthday ? (
            <CalendarRow occ={calendarBirthday} />
          ) : (
            <BirthdayEditor contactId={contactId} manual={manualBirthday} />
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted mb-1.5">Special dates</label>
        <div className="rounded-xl border border-line divide-y divide-line">
          {special.map((o) =>
            o.source === "calendar" ? (
              <CalendarRow key={o.id} occ={o} />
            ) : (
              <SpecialDateRow key={o.id} contactId={contactId} occ={o} />
            )
          )}
          {adding && <SpecialDateRow contactId={contactId} onClose={() => setAdding(false)} />}
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full text-left px-3 py-2.5 text-sm text-accent hover:bg-surface-2/60"
            >
              + Add special date
            </button>
          )}
        </div>
        {special.length === 0 && !adding && (
          <p className="text-[11px] text-muted mt-1">An anniversary, or any date you name: graduation, a work milestone…</p>
        )}
      </div>
    </section>
  );
}

/** Read-only row for a date that comes from the synced Google Calendar. */
function CalendarRow({ occ }: { occ: Occasion }) {
  const router = useRouter();
  const today = useToday();
  const [pending, startTransition] = useTransition();
  const days = today ? daysBetween(today, nextOccurrence(occ.month, occ.day, today)) : null;
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">{occasionTypeLabel(occ)}</p>
          <p className="text-sm">
            {formatMonthDay(occ.month, occ.day, occ.year)}
            {days !== null && <span className="text-muted"> · {relativeDay(days)}</span>}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await unlinkOccasion(occ.id);
              router.refresh();
            })
          }
          className="text-xs text-muted hover:text-ink shrink-0"
        >
          Unlink
        </button>
      </div>
      <p className="text-[11px] text-muted mt-1">
        From your Google Calendar{occ.label ? ` (“${occ.label}”)` : ""}. Edit it there; it updates on the next sync.
      </p>
    </div>
  );
}

function BirthdayEditor({ contactId, manual }: { contactId: string; manual: Occasion | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initial: SimpleDate | null = manual ? { month: manual.month, day: manual.day, year: manual.year } : null;
  const [value, setValue] = useState<SimpleDate | null>(initial);
  const [error, setError] = useState("");
  const dirty = !sameDate(value, initial) && (value === null || isCompleteDate(value));

  function save(next: SimpleDate | null) {
    setError("");
    startTransition(async () => {
      try {
        await setContactOccasion(contactId, "birthday", next);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save.");
      }
    });
  }

  return (
    <div className="px-3 py-2.5">
      <OccasionDateInput idPrefix="contact-birthday" value={value} onChange={setValue} size="sm" />
      <div className="flex items-center gap-3 mt-2 empty:hidden">
        {dirty && (
          <button
            type="button"
            disabled={pending}
            onClick={() => save(value && isCompleteDate(value) ? value : null)}
            className="text-xs px-3 py-1.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : value ? "Save birthday" : "Remove birthday"}
          </button>
        )}
        {manual && !dirty && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setValue(null);
              save(null);
            }}
            className="text-xs text-muted hover:text-ink"
          >
            Clear
          </button>
        )}
        {error && <span className="text-xs text-rust">{error}</span>}
      </div>
    </div>
  );
}

/**
 * One special date. Saved dates show as a summary line with Edit; a new
 * one (no `occ`) opens straight into the editor.
 */
function SpecialDateRow({
  contactId,
  occ,
  onClose,
}: {
  contactId: string;
  occ?: Occasion;
  onClose?: () => void;
}) {
  const router = useRouter();
  const today = useToday();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(!occ);
  const [type, setType] = useState<"anniversary" | "other">(occ?.kind === "other" ? "other" : "anniversary");
  const [label, setLabel] = useState(occ?.kind === "other" ? occ.label : "");
  const [value, setValue] = useState<SimpleDate | null>(
    occ ? { month: occ.month, day: occ.day, year: occ.year } : null
  );
  const [error, setError] = useState("");
  const fieldId = occ ? occ.id : "new";

  function close() {
    setError("");
    if (occ) {
      setEditing(false);
      setType(occ.kind === "other" ? "other" : "anniversary");
      setLabel(occ.kind === "other" ? occ.label : "");
      setValue({ month: occ.month, day: occ.day, year: occ.year });
    } else onClose?.();
  }

  function save() {
    setError("");
    if (!value || !isCompleteDate(value)) {
      setError("Pick a month and day. The year is optional.");
      return;
    }
    if (type === "other" && !label.trim()) {
      setError("Name the date, e.g. “Graduation”.");
      return;
    }
    startTransition(async () => {
      try {
        await saveSpecialDate({ id: occ?.id ?? null, contactId, kind: type, label, date: value });
        if (occ) setEditing(false);
        else onClose?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save.");
      }
    });
  }

  function remove() {
    if (!occ) return;
    startTransition(async () => {
      await unlinkOccasion(occ.id);
      router.refresh();
    });
  }

  if (occ && !editing) {
    const days = today ? daysBetween(today, nextOccurrence(occ.month, occ.day, today)) : null;
    return (
      <div className="px-3 py-2.5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted truncate">{occasionTypeLabel(occ)}</p>
          <p className="text-sm">
            {formatMonthDay(occ.month, occ.day, occ.year)}
            {days !== null && <span className="text-muted"> · {relativeDay(days)}</span>}
          </p>
        </div>
        <button type="button" onClick={() => setEditing(true)} className="text-xs text-accent shrink-0">
          Edit
        </button>
      </div>
    );
  }

  const field =
    "w-full rounded-lg bg-surface-2 border border-line px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 min-w-0";

  return (
    <div className="px-3 py-3 space-y-2 bg-surface-2/30">
      <div className={`grid gap-2 ${type === "other" ? "grid-cols-[auto_1fr]" : "grid-cols-1"}`}>
        <div>
          <label htmlFor={`special-type-${fieldId}`} className="block text-[11px] text-muted mb-1">
            Type
          </label>
          <select
            id={`special-type-${fieldId}`}
            value={type}
            onChange={(e) => setType(e.target.value as "anniversary" | "other")}
            className={field}
          >
            <option value="anniversary">Anniversary</option>
            <option value="other">Other event…</option>
          </select>
        </div>
        {type === "other" && (
          <div className="min-w-0">
            <label htmlFor={`special-label-${fieldId}`} className="block text-[11px] text-muted mb-1">
              Event
            </label>
            <input
              id={`special-label-${fieldId}`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={60}
              placeholder="e.g. Graduation"
              autoFocus={!occ}
              className={field}
            />
          </div>
        )}
      </div>
      <div>
        <p className="text-[11px] text-muted mb-1">Date</p>
        <OccasionDateInput idPrefix={`special-date-${fieldId}`} value={value} onChange={setValue} size="sm" />
      </div>
      {error && <p className="text-xs text-rust">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="text-xs px-3 py-1.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={close} className="text-xs text-muted hover:text-ink">
          Cancel
        </button>
        {occ && (
          <button type="button" disabled={pending} onClick={remove} className="ml-auto text-xs text-rust/80 hover:text-rust">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
