"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Channel, Contact, EventContact, EventRow, Sequence, Tag } from "@/lib/types";
import { CHANNEL_LABEL } from "@/lib/types";
import { SequenceDots, StatusDot, TagPill } from "@/components/ui";
import StepAction from "@/components/events/StepAction";
import VariableButtons from "@/components/events/VariableButtons";
import {
  addSequenceStep,
  updateSequenceStep,
  deleteSequenceStep,
  addContactsToEvent,
  addContactsByTag,
  removeContactFromEvent,
  toggleResponded,
  updateEventNotes,
} from "@/app/(app)/blasts/actions";

type RosterRow = EventContact & { contact: Contact };

export default function EventDetailClient({
  event,
  sequences,
  roster,
  allContacts,
  allTags,
}: {
  event: EventRow;
  sequences: Sequence[];
  roster: RosterRow[];
  allContacts: Contact[];
  allTags: Tag[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAddContacts, setShowAddContacts] = useState(false);
  const [rosterQuery, setRosterQuery] = useState("");
  const [notes, setNotes] = useState(event.notes || "");
  const [notesDirty, setNotesDirty] = useState(false);

  const sortedSteps = useMemo(
    () => [...sequences].sort((a, b) => a.step_number - b.step_number),
    [sequences]
  );

  const filteredRoster = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((r) => r.contact.full_name.toLowerCase().includes(q));
  }, [roster, rosterQuery]);

  const respondedCount = roster.filter((r) => r.responded).length;

  const stats = useMemo(() => {
    const total = roster.length;
    const totalSent = roster.reduce((sum, r) => sum + r.current_step, 0);
    const perStep = sortedSteps.map((step) => ({
      step,
      sent: roster.filter((r) => Boolean(r.sent_steps?.[step.step_number])).length,
    }));
    return { total, totalSent, perStep };
  }, [roster, sortedSteps]);

  function saveNotes() {
    startTransition(async () => {
      await updateEventNotes(event.id, notes);
      setNotesDirty(false);
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24">
      <Link href="/blasts" className="text-sm text-muted hover:text-ink">
        ← All blasts
      </Link>
      <h1 className="font-display text-2xl md:text-3xl mt-3">{event.name}</h1>
      {event.description && <p className="text-sm text-muted mt-1">{event.description}</p>}

      <section className="mt-4 mb-8">
        <label className="block text-xs text-muted mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          rows={2}
          placeholder="Anything worth remembering about this blast…"
          className="w-full rounded-lg bg-surface border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        {notesDirty && (
          <button
            onClick={saveNotes}
            disabled={pending}
            className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save notes"}
          </button>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-display text-lg mb-3">Stats</h2>
        {stats.total === 0 ? (
          <p className="text-sm text-muted">Add contacts to see stats.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl border border-line p-3.5 bg-surface/40">
                <p className="text-2xl font-display">{stats.total}</p>
                <p className="text-xs text-muted mt-0.5">Contacts</p>
              </div>
              <div className="rounded-xl border border-line p-3.5 bg-surface/40">
                <p className="text-2xl font-display">{stats.totalSent}</p>
                <p className="text-xs text-muted mt-0.5">Messages sent</p>
              </div>
              <div className="rounded-xl border border-line p-3.5 bg-surface/40">
                <p className="text-2xl font-display">
                  {respondedCount}
                  <span className="text-sm text-muted font-body ml-1">
                    ({Math.round((respondedCount / stats.total) * 100)}%)
                  </span>
                </p>
                <p className="text-xs text-muted mt-0.5">Responded</p>
              </div>
            </div>
            {stats.perStep.length > 0 && (
              <div className="rounded-xl border border-line p-3.5 bg-surface/40 space-y-2.5">
                <p className="text-xs text-muted mb-1">By sequence step</p>
                {stats.perStep.map(({ step, sent }) => {
                  const pct = Math.round((sent / stats.total) * 100);
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <span className="text-xs text-muted w-14 shrink-0">
                        Step {step.step_number}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted w-24 shrink-0 text-right">
                        {sent}/{stats.total} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-display text-lg mb-3">Message sequence</h2>
        <div className="space-y-3">
          {sortedSteps.map((step) => (
            <SequenceStepRow key={step.id} step={step} eventId={event.id} />
          ))}
        </div>
        <AddStepForm
          eventId={event.id}
          nextStep={(sortedSteps.at(-1)?.step_number || 0) + 1}
        />
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="font-display text-lg">
            Roster · {roster.length} contact{roster.length === 1 ? "" : "s"}
            {roster.length > 0 && (
              <span className="text-sm text-muted font-body ml-2">
                {respondedCount} responded
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowAddContacts(true)}
            className="text-sm px-3 py-2 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover"
          >
            + Add contacts
          </button>
        </div>

        {roster.length > 0 && (
          <input
            value={rosterQuery}
            onChange={(e) => setRosterQuery(e.target.value)}
            placeholder="Search roster…"
            className="w-full sm:w-64 rounded-lg bg-surface border border-line px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        )}

        <div className="rounded-xl border border-line overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-surface-2 text-muted text-xs">
              <tr>
                <th className="text-left px-3 py-2 font-normal sticky left-0 z-20 bg-surface-2 border-r border-line">
                  Contact
                </th>
                <th className="text-left px-3 py-2 font-normal">Progress</th>
                <th className="text-left px-3 py-2 font-normal">Steps</th>
                <th className="text-left px-3 py-2 font-normal">Responded</th>
                <th className="px-3 py-2 font-normal"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredRoster.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-8">
                    {roster.length === 0
                      ? "No contacts yet — add some to start sending."
                      : "No matches."}
                  </td>
                </tr>
              )}
              {filteredRoster.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2.5 align-top sticky left-0 z-10 bg-bg border-r border-line">
                    <Link href={`/contacts/${r.contact.id}`} className="flex items-center gap-2 hover:text-accent">
                      <StatusDot status={r.contact.status} />
                      <span className="whitespace-nowrap">{r.contact.full_name}</span>
                    </Link>
                    <div className="flex gap-1 mt-1">
                      {r.contact.tags?.slice(0, 2).map((t) => (
                        <TagPill key={t.id} tag={t} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <SequenceDots total={sortedSteps.length} sent={r.current_step} size={7} />
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex flex-wrap gap-2">
                      {sortedSteps.map((step) => (
                        <StepAction
                          key={step.id}
                          step={step}
                          contact={r.contact}
                          eventContactId={r.id}
                          eventId={event.id}
                          blastName={event.name}
                          sent={Boolean(r.sent_steps?.[step.step_number])}
                          onChanged={() => router.refresh()}
                          compact
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <input
                      type="checkbox"
                      checked={r.responded}
                      onChange={(e) =>
                        startTransition(async () => {
                          await toggleResponded({
                            eventContactId: r.id,
                            eventId: event.id,
                            contactId: r.contact.id,
                            blastName: event.name,
                            responded: e.target.checked,
                          });
                          router.refresh();
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right align-top">
                    <button
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await removeContactFromEvent(r.id, event.id);
                          router.refresh();
                        })
                      }
                      className="text-xs text-muted hover:text-rust"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAddContacts && (
        <AddContactsModal
          eventId={event.id}
          allContacts={allContacts}
          allTags={allTags}
          alreadyIn={new Set(roster.map((r) => r.contact.id))}
          onClose={() => setShowAddContacts(false)}
          onDone={() => {
            setShowAddContacts(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SequenceStepRow({ step, eventId }: { step: Sequence; eventId: string }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(step.body);
  const [channel, setChannel] = useState<Channel>(step.channel);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function save() {
    startTransition(async () => {
      await updateSequenceStep(step.id, eventId, { body, channel });
      setEditing(false);
      router.refresh();
    });
  }

  function copy() {
    navigator.clipboard?.writeText(step.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-xl border border-line p-3.5 bg-surface/40">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent">
          Step {step.step_number}
        </span>
        {editing ? (
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            className="text-xs rounded-md bg-surface-2 border border-line px-2 py-1"
          >
            {Object.entries(CHANNEL_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted">{CHANNEL_LABEL[step.channel]}</span>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={copy} className="text-xs text-muted hover:text-ink">
            {copied ? "Copied" : "Copy"}
          </button>
          {editing ? (
            <button onClick={save} disabled={pending} className="text-xs text-accent">
              {pending ? "Saving…" : "Save"}
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-ink">
              Edit
            </button>
          )}
          <button
            onClick={() => {
              if (!confirm(`Delete step ${step.step_number}?`)) return;
              startTransition(async () => {
                await deleteSequenceStep(step.id, eventId);
                router.refresh();
              });
            }}
            className="text-xs text-rust/70 hover:text-rust"
          >
            Delete
          </button>
        </div>
      </div>
      {editing ? (
        <div className="space-y-1.5">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <VariableButtons textareaRef={textareaRef} value={body} onChange={setBody} />
        </div>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{step.body}</p>
      )}
    </div>
  );
}

function AddStepForm({ eventId, nextStep }: { eventId: string; nextStep: number }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-3 text-sm py-2.5 rounded-xl border border-dashed border-line text-muted hover:text-ink hover:border-ink/40"
      >
        + Add step {nextStep}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-line p-3.5 bg-surface/40 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/15 text-accent">
          Step {nextStep}
        </span>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as Channel)}
          className="text-xs rounded-md bg-surface-2 border border-line px-2 py-1"
        >
          {Object.entries(CHANNEL_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Hey {first_name}, ..."
        className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm mb-1.5 focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
      <div className="mb-2">
        <VariableButtons textareaRef={textareaRef} value={body} onChange={setBody} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 py-2 rounded-lg border border-line text-sm"
        >
          Cancel
        </button>
        <button
          disabled={pending || !body.trim()}
          onClick={() =>
            startTransition(async () => {
              await addSequenceStep(eventId, nextStep, channel, body.trim());
              setBody("");
              setOpen(false);
              router.refresh();
            })
          }
          className="flex-1 py-2 rounded-lg bg-accent text-bg text-sm font-medium disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add step"}
        </button>
      </div>
    </div>
  );
}

function AddContactsModal({
  eventId,
  allContacts,
  allTags,
  alreadyIn,
  onClose,
  onDone,
}: {
  eventId: string;
  allContacts: Contact[];
  allTags: Tag[];
  alreadyIn: Set<string>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tab, setTab] = useState<"pick" | "tag">("pick");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const available = allContacts.filter((c) => !alreadyIn.has(c.id));
  const filtered = available.filter((c) =>
    c.full_name.toLowerCase().includes(query.toLowerCase())
  );

  function addSelected() {
    startTransition(async () => {
      await addContactsToEvent(eventId, [...selected]);
      onDone();
    });
  }

  function addByTag(tagId: string) {
    startTransition(async () => {
      await addContactsByTag(eventId, tagId);
      onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[85vh] flex flex-col">
        <h2 className="font-display text-xl mb-3">Add contacts</h2>
        <div className="flex gap-1 mb-3 text-sm">
          <button
            onClick={() => setTab("pick")}
            className={`px-3 py-1.5 rounded-lg ${tab === "pick" ? "bg-accent/15 text-accent" : "text-muted"}`}
          >
            Pick contacts
          </button>
          <button
            onClick={() => setTab("tag")}
            className={`px-3 py-1.5 rounded-lg ${tab === "tag" ? "bg-accent/15 text-accent" : "text-muted"}`}
          >
            By tag
          </button>
        </div>

        {tab === "pick" ? (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts…"
              className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <div className="flex-1 overflow-y-auto divide-y divide-line border border-line rounded-lg mb-3">
              {filtered.length === 0 && (
                <p className="text-sm text-muted text-center py-6">No contacts to add.</p>
              )}
              {filtered.map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() =>
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      })
                    }
                  />
                  {c.full_name}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-line text-sm">
                Cancel
              </button>
              <button
                onClick={addSelected}
                disabled={pending || selected.size === 0}
                className="flex-1 py-2.5 rounded-lg bg-accent text-bg text-sm font-medium disabled:opacity-60"
              >
                {pending ? "Adding…" : `Add ${selected.size || ""}`.trim()}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            {allTags.length === 0 && (
              <p className="text-sm text-muted text-center py-6">No tags yet.</p>
            )}
            {allTags.map((t) => (
              <button
                key={t.id}
                disabled={pending}
                onClick={() => addByTag(t.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-line hover:border-ink/40 text-sm text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                Add everyone tagged &quot;{t.name}&quot;
              </button>
            ))}
            <button onClick={onClose} className="w-full py-2.5 rounded-lg border border-line text-sm mt-2">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
