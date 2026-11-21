"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Channel, Contact, Occasion } from "@/lib/types";
import { CHANNEL_LABEL } from "@/lib/types";
import { buildSendLink, renderTemplate } from "@/lib/links";
import { occasionTypeLabel, wishTemplate } from "@/lib/occasions";
import { markWished } from "@/app/(app)/home/actions";

const CHANNELS: Channel[] = ["sms", "whatsapp", "email", "instagram"];

/**
 * Pick a channel and send birthday/anniversary wishes. Opening a channel
 * launches the real app with the message filled in (same as blast steps)
 * and marks this year's wishes as sent.
 */
export default function WishSheet({
  occasion,
  contact,
  year,
  onClose,
  onSent,
}: {
  occasion: Occasion;
  contact: Contact;
  /** The year of the occurrence being wished (so a Dec 31 birthday wished late still counts). */
  year: number;
  onClose: () => void;
  onSent: () => void;
}) {
  const [message, setMessage] = useState(() => renderTemplate(wishTemplate(occasion), contact));
  const [note, setNote] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // The second number gets its own Text/WhatsApp buttons, named by its label.
  const second = contact.phone2 ? { ...contact, phone: contact.phone2 } : null;
  const secondName = contact.phone2_label?.trim() || "Phone 2";
  const options: { key: string; channel: Channel; label: string; target: Contact }[] = [
    ...CHANNELS.map((channel) => ({ key: channel, channel, label: CHANNEL_LABEL[channel], target: contact })),
    ...(second
      ? (["sms", "whatsapp"] as Channel[]).map((channel) => ({
          key: `${channel}-2`,
          channel,
          label: `${CHANNEL_LABEL[channel]} · ${secondName}`,
          target: second,
        }))
      : []),
  ];
  const available = options.filter((o) => buildSendLink(o.channel, o.target, message).kind === "link");

  function send(channel: Channel, target: Contact) {
    const link = buildSendLink(channel, target, message);
    if (link.kind === "unavailable") return;
    if (link.copyText && navigator.clipboard) navigator.clipboard.writeText(link.copyText).catch(() => {});
    window.open(link.href, "_blank");
    startTransition(async () => {
      await markWished({ occasionId: occasion.id, contactId: contact.id, kind: occasion.kind, year, channel });
      onSent();
    });
    if (link.note) setNote(link.note);
    else onClose();
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4"
      >
        <div>
          <p className="text-xs text-muted">{occasionTypeLabel(occasion)} wishes</p>
          <h2 className="font-display text-xl">{contact.full_name}</h2>
        </div>

        <div>
          <label htmlFor="wish-message" className="block text-xs text-muted mb-1">
            Message
          </label>
          <textarea
            id="wish-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        {note ? (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm">
            {note}
            <button onClick={onClose} className="block mt-2 text-accent text-sm font-medium">
              Done
            </button>
          </div>
        ) : available.length ? (
          <div className="grid grid-cols-2 gap-2">
            {available.map(({ key, channel, label, target }, i) => (
              <button
                key={key}
                onClick={() => send(channel, target)}
                className={`py-2.5 rounded-lg text-sm font-medium ${
                  i === 0
                    ? "bg-accent text-bg hover:bg-accent-hover"
                    : "border border-line hover:bg-surface-2"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            No phone, email or Instagram on file.{" "}
            <Link href={`/contacts/${contact.id}`} className="text-accent">
              Add one →
            </Link>
          </p>
        )}

        <button onClick={onClose} className="w-full py-2 text-sm text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
