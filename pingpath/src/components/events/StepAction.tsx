"use client";

import { useState, useTransition } from "react";
import type { Contact, Sequence } from "@/lib/types";
import { buildSendLink, renderTemplate } from "@/lib/links";
import { markStepSent, unmarkStepSent } from "@/app/(app)/blasts/actions";

/**
 * One sequence step's controls for one contact, laid out as a single
 * segmented pill so the "Open" action and the "Sent" toggle line up
 * cleanly at the same height (important once several of these wrap
 * across a narrow mobile screen). "Open" just launches the right app
 * and never touches the database; "Sent" is the separate, deliberate
 * confirmation. All steps are always shown, so any step can be skipped
 * or sent out of order.
 */
export default function StepAction({
  step,
  contact,
  eventContactId,
  eventId,
  blastName,
  sent,
  onChanged,
  compact,
}: {
  step: Sequence;
  contact: Contact;
  eventContactId: string;
  eventId: string;
  blastName: string;
  sent: boolean;
  onChanged?: () => void;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  const message = renderTemplate(step.body, contact);
  const link = buildSendLink(step.channel, contact, message);
  const pad = compact ? "px-2 py-1.5" : "px-2.5 py-2";

  function handleOpen() {
    if (link.kind === "unavailable") return;
    if (link.copyText && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link.copyText).catch(() => {});
    }
    if (link.note) {
      setNote(link.note);
      setTimeout(() => setNote(null), 4000);
    }
    window.open(link.href, "_blank");
  }

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      if (checked) {
        await markStepSent({
          eventContactId,
          eventId,
          contactId: contact.id,
          blastName,
          stepNumber: step.step_number,
          channel: step.channel,
        });
      } else {
        await unmarkStepSent({
          eventContactId,
          eventId,
          contactId: contact.id,
          blastName,
          stepNumber: step.step_number,
        });
      }
      onChanged?.();
    });
  }

  return (
    <div className="inline-flex flex-col items-start align-top">
      <div
        className={`inline-flex items-stretch rounded-lg border overflow-hidden text-xs leading-none ${
          sent ? "border-moss/40" : "border-line"
        }`}
      >
        <span
          className={`flex items-center ${pad} font-medium ${
            sent ? "bg-moss/10 text-moss" : "text-muted"
          }`}
        >
          #{step.step_number}
        </span>
        <button
          onClick={handleOpen}
          disabled={link.kind === "unavailable"}
          title={link.kind === "unavailable" ? link.reason : `Open ${step.channel}`}
          className={`flex items-center ${pad} border-l ${
            sent ? "border-moss/40" : "border-line"
          } text-accent hover:bg-accent/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
        >
          Open
        </button>
        <label
          className={`flex items-center gap-1.5 ${pad} border-l cursor-pointer ${
            sent ? "border-moss/40 bg-moss/10 text-moss" : "border-line text-muted hover:bg-surface-2"
          } ${pending ? "opacity-60" : ""}`}
        >
          <input
            type="checkbox"
            className="w-3.5 h-3.5 shrink-0"
            checked={sent}
            disabled={pending}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          Sent
        </label>
      </div>
      {note && <span className="text-[11px] text-muted mt-1 max-w-[180px]">{note}</span>}
    </div>
  );
}
