"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Contact } from "@/lib/types";
import { formatMonthDay, type SimpleDate } from "@/lib/occasions";
import OccasionDateInput, { isCompleteDate } from "@/components/OccasionDateInput";
import PhoneLabelInput from "@/components/PhoneLabelInput";
import { removeContactFromTag, updateContact } from "@/app/(app)/contacts/actions";
import { setContactOccasion } from "@/app/(app)/home/actions";

export type SheetBirthday = { month: number; day: number; year: number | null; source: "manual" | "calendar" } | null;

const TEXT_FIELDS = ["full_name", "nickname", "phone", "phone2", "phone2_label", "email", "instagram_handle", "notes"] as const;
type FieldKey = (typeof TEXT_FIELDS)[number];

/**
 * Edit a contact's main details without leaving the list you're working
 * through (used from a tag's page). Saves only what changed.
 */
export default function ContactEditSheet({
  contact,
  birthday,
  tag,
  onClose,
  onSaved,
}: {
  contact: Contact;
  birthday: SheetBirthday;
  tag?: { id: string; name: string };
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const initial: Record<FieldKey, string> = {
    full_name: contact.full_name,
    nickname: contact.nickname || "",
    phone: contact.phone || "",
    phone2: contact.phone2 || "",
    phone2_label: contact.phone2_label || "",
    email: contact.email || "",
    instagram_handle: contact.instagram_handle || "",
    notes: contact.notes || "",
  };
  const [fields, setFields] = useState(initial);
  const manualBirthday: SimpleDate | null =
    birthday && birthday.source === "manual" ? { month: birthday.month, day: birthday.day, year: birthday.year } : null;
  const [bday, setBday] = useState<SimpleDate | null>(manualBirthday);

  const set = (k: FieldKey) => (v: string) => setFields((f) => ({ ...f, [k]: v }));
  const field =
    "w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50";

  function save() {
    setError("");
    if (!fields.full_name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    if (bday && !isCompleteDate(bday)) {
      setError("Birthday: pick a month and day (the year is optional).");
      return;
    }
    const changed: Partial<Record<FieldKey, string | null>> = {};
    for (const k of TEXT_FIELDS) {
      if (fields[k] !== initial[k]) {
        const v = fields[k].trim();
        changed[k] = k === "full_name" || k === "notes" ? v : v || null;
      }
    }
    const bdayChanged =
      birthday?.source !== "calendar" && JSON.stringify(bday) !== JSON.stringify(manualBirthday);

    if (!Object.keys(changed).length && !bdayChanged) {
      onClose();
      return;
    }
    startTransition(async () => {
      try {
        if (Object.keys(changed).length) {
          await updateContact(contact.id, changed as Parameters<typeof updateContact>[1]);
        }
        if (bdayChanged) await setContactOccasion(contact.id, "birthday", bday);
        onSaved(`Saved ${fields.full_name.trim()}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save.");
      }
    });
  }

  function remove() {
    if (!tag) return;
    startTransition(async () => {
      try {
        await removeContactFromTag(contact.id, tag.id);
        onSaved(`Removed ${contact.full_name} from ${tag.name}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't remove.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h2 className="font-display text-xl truncate">Edit contact</h2>
          <Link href={`/contacts/${contact.id}`} className="text-xs text-accent shrink-0">
            Full profile →
          </Link>
        </div>

        <div className="overflow-y-auto px-5 pb-3 space-y-3">
          <div>
            <label htmlFor="edit-name" className="block text-xs text-muted mb-1">
              Full name
            </label>
            <input id="edit-name" value={fields.full_name} onChange={(e) => set("full_name")(e.target.value)} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-nickname" className="block text-xs text-muted mb-1">
                Nickname
              </label>
              <input id="edit-nickname" value={fields.nickname} onChange={(e) => set("nickname")(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="edit-phone" className="block text-xs text-muted mb-1">
                Phone
              </label>
              <input id="edit-phone" type="tel" value={fields.phone} onChange={(e) => set("phone")(e.target.value)} className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-phone2" className="block text-xs text-muted mb-1">
                Phone 2
              </label>
              <input id="edit-phone2" type="tel" value={fields.phone2} onChange={(e) => set("phone2")(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="edit-phone2-label" className="block text-xs text-muted mb-1">
                Phone 2 label
              </label>
              <PhoneLabelInput
                id="edit-phone2-label"
                value={fields.phone2_label}
                onChange={set("phone2_label")}
                inputClassName={field}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-email" className="block text-xs text-muted mb-1">
                Email
              </label>
              <input id="edit-email" type="email" value={fields.email} onChange={(e) => set("email")(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="edit-ig" className="block text-xs text-muted mb-1">
                Instagram
              </label>
              <input
                id="edit-ig"
                value={fields.instagram_handle}
                onChange={(e) => set("instagram_handle")(e.target.value)}
                placeholder="@username"
                className={field}
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted mb-1">Birthday</p>
            {birthday?.source === "calendar" ? (
              <p className="text-sm">
                {formatMonthDay(birthday.month, birthday.day, birthday.year)}{" "}
                <span className="text-xs text-muted">· from Google Calendar</span>
              </p>
            ) : (
              <OccasionDateInput idPrefix="edit-birthday" value={bday} onChange={setBday} />
            )}
          </div>
          <div>
            <label htmlFor="edit-notes" className="block text-xs text-muted mb-1">
              Notes
            </label>
            <textarea
              id="edit-notes"
              rows={2}
              value={fields.notes}
              onChange={(e) => set("notes")(e.target.value)}
              className={field}
            />
          </div>

          {tag && (
            <div className="pt-1">
              {confirmRemove ? (
                <div className="rounded-lg border border-rust/40 bg-rust/10 px-3 py-2.5 text-xs">
                  Remove {contact.full_name} from “{tag.name}”? The contact itself stays.
                  <div className="flex gap-4 mt-2">
                    <button onClick={remove} disabled={pending} className="text-rust font-medium">
                      Remove from tag
                    </button>
                    <button onClick={() => setConfirmRemove(false)} className="text-muted">
                      Keep
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmRemove(true)} className="text-xs text-rust/80 hover:text-rust">
                  Remove from “{tag.name}”
                </button>
              )}
            </div>
          )}
          {error && <p className="text-sm text-rust">{error}</p>}
        </div>

        <div className="flex gap-2 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-line">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-line text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex-1 py-2.5 rounded-lg bg-accent text-bg text-sm font-medium hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
