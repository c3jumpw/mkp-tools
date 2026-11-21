"use client";

import { useState, useTransition } from "react";
import type { Occasion } from "@/lib/types";
import { OCCASION_LABEL } from "@/lib/types";
import { formatMonthDay, type SimpleDate } from "@/lib/occasions";
import OccasionDateInput, { isCompleteDate } from "@/components/OccasionDateInput";
import PhoneLabelInput from "@/components/PhoneLabelInput";
import { quickAddContact } from "@/app/(app)/home/actions";

/**
 * Fast contact entry from the home page. When opened from an unlinked
 * calendar entry, the new contact is linked to it automatically.
 */
export default function QuickAddModal({
  from,
  onClose,
  onCreated,
}: {
  from?: Occasion | null;
  onClose: () => void;
  onCreated: (contact: { id: string; name: string }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [name, setName] = useState(from?.label || "");
  const [birthday, setBirthday] = useState<SimpleDate | null>(null);
  const [specialType, setSpecialType] = useState<"anniversary" | "other">(
    from?.kind === "anniversary" ? "other" : "anniversary"
  );
  const [specialLabel, setSpecialLabel] = useState("");
  const [special, setSpecial] = useState<SimpleDate | null>(null);

  function handleSubmit(formData: FormData) {
    setError("");
    const full_name = name.trim();
    if (!full_name) {
      setError("Name is required.");
      return;
    }
    for (const [label, v] of [
      ["Birthday", birthday],
      ["Special date", special],
    ] as const) {
      if (v && !isCompleteDate(v)) {
        setError(`${label}: pick a month and day (year is optional, 4 digits).`);
        return;
      }
    }
    if (special && specialType === "other" && !specialLabel.trim()) {
      setError("Special date: give it a name, e.g. “Graduation”.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await quickAddContact({
          full_name,
          nickname: String(formData.get("nickname") || ""),
          phone: String(formData.get("phone") || ""),
          email: String(formData.get("email") || ""),
          instagram_handle: String(formData.get("instagram_handle") || ""),
          phone2: String(formData.get("phone2") || ""),
          phone2_label: String(formData.get("phone2_label") || ""),
          birthday,
          special: special && isCompleteDate(special) ? { kind: specialType, label: specialLabel, date: special } : null,
          linkOccasionId: from?.id ?? null,
        });
        onCreated({ id: res.id, name: full_name });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const field =
    "w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50";

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <form
        action={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-3 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display text-xl">Quick add</h2>

        {from && (
          <p className="text-xs rounded-lg border border-accent/40 bg-accent/10 px-3 py-2">
            Will be linked to “{from.label}” — {OCCASION_LABEL[from.kind].toLowerCase()},{" "}
            {formatMonthDay(from.month, from.day, from.year)}, from your calendar.
          </p>
        )}

        <div>
          <label htmlFor="qa-name" className="block text-sm text-muted mb-1.5">
            Full name
          </label>
          <input id="qa-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="qa-phone" className="block text-sm text-muted mb-1.5">
              Phone
            </label>
            <input id="qa-phone" name="phone" type="tel" placeholder="+1 555 123 4567" className={field} />
          </div>
          <div>
            <label htmlFor="qa-nickname" className="block text-sm text-muted mb-1.5">
              Nickname
            </label>
            <input id="qa-nickname" name="nickname" placeholder="Optional" className={field} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="qa-phone2" className="block text-sm text-muted mb-1.5">
              Phone 2
            </label>
            <input id="qa-phone2" name="phone2" type="tel" placeholder="Optional" className={field} />
          </div>
          <div>
            <label htmlFor="qa-phone2-label" className="block text-sm text-muted mb-1.5">
              Phone 2 label
            </label>
            <PhoneLabelInput id="qa-phone2-label" name="phone2_label" inputClassName={field} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="qa-email" className="block text-sm text-muted mb-1.5">
              Email
            </label>
            <input id="qa-email" name="email" type="email" className={field} />
          </div>
          <div>
            <label htmlFor="qa-ig" className="block text-sm text-muted mb-1.5">
              Instagram
            </label>
            <input id="qa-ig" name="instagram_handle" placeholder="@username" className={field} />
          </div>
        </div>

        {from?.kind !== "birthday" && (
          <div>
            <p className="text-sm text-muted mb-1.5">Birthday</p>
            <OccasionDateInput idPrefix="qa-birthday" value={birthday} onChange={setBirthday} />
          </div>
        )}
        <div>
          <p className="text-sm text-muted mb-1.5">Special date</p>
          <div className={`grid gap-2 mb-2 ${specialType === "other" ? "grid-cols-[auto_1fr]" : "grid-cols-1"}`}>
            <select
              id="qa-special-type"
              aria-label="Special date type"
              value={specialType}
              onChange={(e) => setSpecialType(e.target.value as "anniversary" | "other")}
              className={field}
            >
              <option value="anniversary" disabled={from?.kind === "anniversary"}>
                Anniversary
              </option>
              <option value="other">Other event…</option>
            </select>
            {specialType === "other" && (
              <input
                id="qa-special-label"
                aria-label="Event name"
                value={specialLabel}
                onChange={(e) => setSpecialLabel(e.target.value)}
                maxLength={60}
                placeholder="e.g. Graduation"
                className={field}
              />
            )}
          </div>
          <OccasionDateInput idPrefix="qa-special" value={special} onChange={setSpecial} />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-line text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="flex-1 py-2.5 rounded-lg bg-accent text-bg text-sm font-medium hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Saving…" : "Add contact"}
          </button>
        </div>
      </form>
    </div>
  );
}
