"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Contact, EventContact, EventRow, Sequence } from "@/lib/types";
import { CHANNEL_LABEL } from "@/lib/types";
import { buildSendLink, renderTemplate } from "@/lib/links";
import { markStepSent, unmarkStepSent } from "@/app/(app)/blasts/actions";

type RosterRow = EventContact & { contact: Contact };

type DeckEntry = {
  eventContactId: string;
  contact: Contact;
};

type PendingSend = {
  eventContactId: string;
  contact: Contact;
};

type Summary = {
  sent: number;
  skipped: number;
};

type Phase = "setup" | "running" | "done";

/**
 * Blast Deck — a one-card-at-a-time run through a blast's roster for a single
 * sequence step. Tapping Send opens the messaging app; when the person comes
 * back to the browser we mark that step sent and bring up the next card, so
 * the loop is tap → send → return → tap, with no roster hunting in between.
 *
 * "Sent" here means the same thing it means everywhere else in the app: a row
 * in pingpath_send_log written by markStepSent. Nothing is ever sent for you.
 */
export default function DeckClient({
  event,
  sequences,
  roster,
}: {
  event: EventRow;
  sequences: Sequence[];
  roster: RosterRow[];
}) {
  const sortedSteps = useMemo(
    () => [...sequences].sort((a, b) => a.step_number - b.step_number),
    [sequences]
  );

  const [selectedStepNumber, setSelectedStepNumber] = useState<number | null>(null);
  const [includeInvalid, setIncludeInvalid] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const [phase, setPhase] = useState<Phase>("setup");
  const [deck, setDeck] = useState<DeckEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary>({ sent: 0, skipped: 0 });

  // Steps already marked sent during this deck run, so the setup counts stay
  // honest if the person decks a second step without a page refresh.
  const [locallySent, setLocallySent] = useState<Set<string>>(new Set());

  const pendingRef = useRef<PendingSend | null>(null);
  const [pendingUi, setPendingUi] = useState<PendingSend | null>(null);
  const [undo, setUndo] = useState<PendingSend | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sentKey = (eventContactId: string, stepNumber: number) =>
    `${eventContactId}:${stepNumber}`;

  const hasSent = useCallback(
    (row: RosterRow, stepNumber: number) =>
      Boolean(row.sent_steps?.[stepNumber]) ||
      locallySent.has(sentKey(row.id, stepNumber)),
    [locallySent]
  );

  const isReachable = useCallback(
    (row: RosterRow) => {
      const c = row.contact;
      if (!c.visible) return false;
      if (c.status === "do_not_contact") return false;
      if (!includeInvalid && c.status === "invalid") return false;
      return true;
    },
    [includeInvalid]
  );

  const eligibleFor = useCallback(
    (stepNumber: number) =>
      roster.filter((r) => isReachable(r) && !hasSent(r, stepNumber)),
    [roster, isReachable, hasSent]
  );

  // Default to the step with the most people still waiting on it.
  useEffect(() => {
    if (selectedStepNumber !== null || sortedSteps.length === 0) return;
    let best = sortedSteps[0].step_number;
    let bestCount = -1;
    for (const s of sortedSteps) {
      const count = eligibleFor(s.step_number).length;
      if (count > bestCount) {
        bestCount = count;
        best = s.step_number;
      }
    }
    setSelectedStepNumber(best);
  }, [sortedSteps, eligibleFor, selectedStepNumber]);

  const step = useMemo(
    () => sortedSteps.find((s) => s.step_number === selectedStepNumber) ?? null,
    [sortedSteps, selectedStepNumber]
  );

  const eligible = useMemo(
    () => (step ? eligibleFor(step.step_number) : []),
    [step, eligibleFor]
  );

  const included = useMemo(
    () => eligible.filter((r) => !excluded.has(r.id)),
    [eligible, excluded]
  );

  /* ---------------------------------------------------------------- run --- */

  function startDeck() {
    if (!step || included.length === 0) return;
    setDeck(included.map((r) => ({ eventContactId: r.id, contact: r.contact })));
    setTotal(included.length);
    setSummary({ sent: 0, skipped: 0 });
    setPhase("running");
  }

  function exitDeck() {
    pendingRef.current = null;
    setPendingUi(null);
    setUndo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setDeck([]);
    setPhase("setup");
    setExcluded(new Set());
  }

  const commitSend = useCallback(
    async (p: PendingSend) => {
      if (!step) return;
      pendingRef.current = null;
      setPendingUi(null);
      setBusy(true);

      // Optimistic: drop the card and count it before the round trip.
      setDeck((d) => d.filter((e) => e.eventContactId !== p.eventContactId));
      setSummary((s) => ({ ...s, sent: s.sent + 1 }));
      setLocallySent((s) =>
        new Set(s).add(sentKey(p.eventContactId, step.step_number))
      );

      try {
        await markStepSent({
          eventContactId: p.eventContactId,
          eventId: event.id,
          contactId: p.contact.id,
          blastName: event.name,
          stepNumber: step.step_number,
          channel: step.channel,
        });
        setUndo(p);
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => setUndo(null), 6000);
      } catch {
        // Put it back — nothing was recorded.
        setDeck((d) => [{ eventContactId: p.eventContactId, contact: p.contact }, ...d]);
        setSummary((s) => ({ ...s, sent: Math.max(0, s.sent - 1) }));
        setLocallySent((s) => {
          const next = new Set(s);
          next.delete(sentKey(p.eventContactId, step.step_number));
          return next;
        });
        setNote("Couldn't save that one — it's back on top of the deck.");
        setTimeout(() => setNote(null), 5000);
      } finally {
        setBusy(false);
      }
    },
    [step, event.id, event.name]
  );

  // When the person returns from the messaging app, bank the pending send.
  useEffect(() => {
    if (phase !== "running") return;
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const p = pendingRef.current;
      if (!p) return;
      setTimeout(() => {
        if (pendingRef.current?.eventContactId === p.eventContactId) {
          commitSend(p);
        }
      }, 250);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase, commitSend]);

  useEffect(() => {
    if (phase === "running" && deck.length === 0) setPhase("done");
  }, [deck.length, phase]);

  const top = deck[0] ?? null;

  function handleSend() {
    if (!top || !step) return;
    const message = renderTemplate(step.body, top.contact);
    const link = buildSendLink(step.channel, top.contact, message);
    if (link.kind === "unavailable") {
      setNote(link.reason);
      setTimeout(() => setNote(null), 4000);
      return;
    }
    if (link.copyText && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link.copyText).catch(() => {});
    }
    if (link.note) {
      setNote(link.note);
      setTimeout(() => setNote(null), 5000);
    }
    const p: PendingSend = { eventContactId: top.eventContactId, contact: top.contact };
    pendingRef.current = p;
    setPendingUi(p);
    window.open(link.href, "_blank");
  }

  function skipTop() {
    pendingRef.current = null;
    setPendingUi(null);
    setDeck((d) => (d.length <= 1 ? [] : d.slice(1)));
    setSummary((s) => ({ ...s, skipped: s.skipped + 1 }));
  }

  async function undoLast() {
    const p = undo;
    if (!p || !step) return;
    setUndo(null);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setBusy(true);
    setDeck((d) => [{ eventContactId: p.eventContactId, contact: p.contact }, ...d]);
    setSummary((s) => ({ ...s, sent: Math.max(0, s.sent - 1) }));
    setLocallySent((s) => {
      const next = new Set(s);
      next.delete(sentKey(p.eventContactId, step.step_number));
      return next;
    });
    try {
      await unmarkStepSent({
        eventContactId: p.eventContactId,
        eventId: event.id,
        contactId: p.contact.id,
        blastName: event.name,
        stepNumber: step.step_number,
      });
    } catch {
      setNote("Couldn't undo that — check the blast page.");
      setTimeout(() => setNote(null), 5000);
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------- render --- */

  if (sortedSteps.length === 0) {
    return (
      <Centered>
        <p className="text-sm text-muted mb-4">
          This blast has no sequence steps yet, so there&apos;s nothing to deck.
        </p>
        <Link href={`/blasts/${event.id}`} className="text-sm text-accent">
          ← Back to {event.name}
        </Link>
      </Centered>
    );
  }

  if (phase === "setup") {
    return (
      <div className="min-h-dvh p-4 md:p-8 max-w-2xl mx-auto pb-32">
        <Link href={`/blasts/${event.id}`} className="text-sm text-muted hover:text-ink">
          ← {event.name}
        </Link>
        <h1 className="font-display text-2xl md:text-3xl mt-3">Blast Deck</h1>
        <p className="text-sm text-muted mt-1">
          One card at a time. Send, come back, next card&apos;s ready.
        </p>

        <section className="mt-6">
          <h2 className="text-xs text-muted uppercase tracking-wider mb-2">
            Which step?
          </h2>
          <div className="flex flex-wrap gap-2">
            {sortedSteps.map((s) => {
              const count = eligibleFor(s.step_number).length;
              const active = s.step_number === selectedStepNumber;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStepNumber(s.step_number);
                    setExcluded(new Set());
                  }}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${
                    active
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-muted hover:bg-surface-2"
                  }`}
                >
                  #{s.step_number} {CHANNEL_LABEL[s.channel]}
                  <span className="opacity-60"> · {count} left</span>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 text-sm text-muted mt-4">
            <input
              type="checkbox"
              checked={includeInvalid}
              onChange={(e) => {
                setIncludeInvalid(e.target.checked);
                setExcluded(new Set());
              }}
            />
            Include contacts marked invalid
          </label>
        </section>

        {step && (
          <section className="mt-6">
            <h2 className="text-xs text-muted uppercase tracking-wider mb-2">
              Message
            </h2>
            <div className="rounded-xl border border-line bg-surface/40 p-3 text-sm whitespace-pre-wrap">
              {step.body}
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs text-muted uppercase tracking-wider">
              Roster · {included.length} of {eligible.length}
            </h2>
            {excluded.size > 0 && (
              <button
                onClick={() => setExcluded(new Set())}
                className="text-xs text-accent"
              >
                Include all
              </button>
            )}
          </div>

          {eligible.length === 0 ? (
            <p className="text-sm text-muted border border-line rounded-xl p-6 text-center">
              Everyone on this roster has already been sent this step.
            </p>
          ) : (
            <ul className="rounded-xl border border-line overflow-hidden">
              {eligible.map((r) => {
                const off = excluded.has(r.id);
                return (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-b-0 bg-surface/40"
                  >
                    <input
                      type="checkbox"
                      checked={!off}
                      onChange={() => {
                        const next = new Set(excluded);
                        if (next.has(r.id)) next.delete(r.id);
                        else next.add(r.id);
                        setExcluded(next);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${off ? "opacity-40" : ""}`}>
                        {r.contact.full_name}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {r.contact.phone ||
                          r.contact.instagram_handle ||
                          r.contact.email ||
                          "No contact details"}
                      </p>
                    </div>
                    {r.contact.status === "invalid" && (
                      <span className="text-[11px] text-muted">invalid</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={startDeck}
              disabled={!step || included.length === 0}
              className="w-full py-3 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {included.length === 0
                ? "Nobody selected"
                : `Start deck · ${included.length}`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <Centered>
        <p className="font-display text-2xl mb-1">Deck cleared</p>
        <p className="text-sm text-muted mb-6">
          {summary.sent} sent
          {summary.skipped > 0 && ` · ${summary.skipped} skipped`}
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => {
              setPhase("setup");
              setExcluded(new Set());
            }}
            className="px-4 py-2.5 rounded-lg border border-line text-sm hover:bg-surface-2"
          >
            Deck another step
          </button>
          <Link
            href={`/blasts/${event.id}`}
            className="px-4 py-2.5 rounded-lg bg-accent text-bg text-sm font-medium tap-target flex items-center"
          >
            Back to blast
          </Link>
        </div>
      </Centered>
    );
  }

  // running
  if (!top || !step) return null;

  const message = renderTemplate(step.body, top.contact);
  const link = buildSendLink(step.channel, top.contact, message);
  const waiting = pendingUi?.eventContactId === top.eventContactId;
  const doneCount = summary.sent + summary.skipped;

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-line">
        <button onClick={exitDeck} className="text-sm text-muted hover:text-ink">
          ← Exit
        </button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-xs text-muted truncate">{event.name}</p>
          <p className="text-sm">
            Step #{step.step_number} · {doneCount + 1} of {total}
          </p>
        </div>
        <span className="text-xs text-muted tabular-nums">{summary.sent} sent</span>
      </header>

      <div className="h-1 bg-surface">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${total === 0 ? 0 : (doneCount / total) * 100}%` }}
        />
      </div>

      <main className="flex-1 flex items-start justify-center p-4 pb-40">
        <div className="relative w-full max-w-md">
          {deck[2] && (
            <div
              aria-hidden
              className="absolute inset-x-6 top-4 h-40 rounded-2xl border border-line bg-surface/40"
              style={{ transform: "translateY(12px) scale(0.95)" }}
            />
          )}
          {deck[1] && (
            <div
              aria-hidden
              className="absolute inset-x-3 top-2 h-44 rounded-2xl border border-line bg-surface/60"
              style={{ transform: "translateY(6px) scale(0.975)" }}
            />
          )}

          <div className="relative rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl truncate">
                  {top.contact.full_name}
                </p>
                <p className="text-xs text-muted truncate">
                  {step.channel === "instagram"
                    ? top.contact.instagram_handle
                    : step.channel === "email"
                      ? top.contact.email
                      : top.contact.phone}
                </p>
              </div>
              {top.contact.status === "invalid" && (
                <span className="text-[11px] text-rust shrink-0">invalid</span>
              )}
            </div>

            {top.contact.notes && (
              <p className="text-xs text-muted mt-3 line-clamp-3 whitespace-pre-wrap">
                {top.contact.notes}
              </p>
            )}

            <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
              <p className="text-[11px] text-muted uppercase tracking-wider mb-1">
                {CHANNEL_LABEL[step.channel]}
              </p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>

            <button
              onClick={handleSend}
              disabled={link.kind === "unavailable" || busy}
              className="w-full mt-4 py-3 rounded-lg bg-accent text-bg font-medium text-sm hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {link.kind === "unavailable"
                ? link.reason
                : waiting
                  ? "Waiting for you to come back…"
                  : `Open ${CHANNEL_LABEL[step.channel]}`}
            </button>

            {waiting && (
              <button
                onClick={() => pendingUi && commitSend(pendingUi)}
                disabled={busy}
                className="w-full mt-2 py-2.5 rounded-lg border border-accent text-accent text-sm disabled:opacity-40"
              >
                Sent — next card
              </button>
            )}

            {note && <p className="text-[11px] text-muted mt-3">{note}</p>}
          </div>

          <button
            onClick={skipTop}
            disabled={busy}
            className="w-full mt-3 py-2.5 rounded-lg border border-line text-sm text-muted hover:bg-surface-2 disabled:opacity-40"
          >
            Skip for now
          </button>
        </div>
      </main>

      {undo && (
        <div className="fixed inset-x-0 bottom-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
          <div className="max-w-md mx-auto pointer-events-auto flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3">
            <span className="text-sm flex-1 truncate">
              Marked sent for {undo.contact.full_name}
            </span>
            <button
              onClick={undoLast}
              disabled={busy}
              className="text-sm text-accent font-medium disabled:opacity-40"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 text-center">
      <div className="max-w-sm">{children}</div>
    </div>
  );
}
