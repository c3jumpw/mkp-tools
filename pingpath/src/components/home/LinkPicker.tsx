"use client";

import { useMemo, useState, useTransition } from "react";
import type { Occasion } from "@/lib/types";
import { OCCASION_LABEL } from "@/lib/types";
import { formatMonthDay, normalizeName, suggestContacts } from "@/lib/occasions";
import { linkOccasion } from "@/app/(app)/home/actions";
import type { PickerContact } from "@/components/home/HomeClient";

/** Search your contacts and attach a calendar entry to one of them. */
export default function LinkPicker({
  occasion,
  contacts,
  onClose,
  onLinked,
  onAddNew,
}: {
  occasion: Occasion;
  contacts: PickerContact[];
  onClose: () => void;
  onLinked: () => void;
  onAddNew: () => void;
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const results = useMemo(() => {
    const q = normalizeName(query);
    if (!q) return suggestContacts(occasion.label, contacts, 6);
    return contacts
      .filter((c) => normalizeName(c.full_name).includes(q) || (c.nickname && normalizeName(c.nickname).includes(q)))
      .slice(0, 40);
  }, [query, contacts, occasion.label]);

  function pick(contactId: string) {
    setError("");
    startTransition(async () => {
      try {
        await linkOccasion(occasion.id, contactId);
        onLinked();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't link.");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] flex flex-col max-h-[85vh]"
      >
        <p className="text-xs text-muted">
          {OCCASION_LABEL[occasion.kind]} · {formatMonthDay(occasion.month, occasion.day, occasion.year)}
        </p>
        <h2 className="font-display text-xl mb-3">Link “{occasion.label}”</h2>
        <input
          id="link-search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 mb-2"
        />
        {!query && results.length > 0 && <p className="text-[11px] text-muted mb-1">Possible matches</p>}
        <ul className="overflow-y-auto -mx-1 flex-1 min-h-0">
          {results.map((c) => (
            <li key={c.id}>
              <button
                disabled={pending}
                onClick={() => pick(c.id)}
                className="w-full text-left px-2 py-2 rounded-lg hover:bg-surface-2 disabled:opacity-60 flex items-baseline justify-between gap-3"
              >
                <span className="text-sm truncate">
                  {c.full_name}
                  {c.nickname && <span className="text-muted"> · {c.nickname}</span>}
                </span>
                {c.phone && <span className="text-xs text-muted shrink-0">{c.phone}</span>}
              </button>
            </li>
          ))}
          {query && results.length === 0 && <li className="text-sm text-muted px-2 py-2">No contacts match.</li>}
        </ul>
        {error && <p className="text-sm text-rust mt-2">{error}</p>}
        <div className="flex gap-2 pt-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-line text-sm">
            Cancel
          </button>
          <button
            onClick={onAddNew}
            className="flex-1 py-2.5 rounded-lg border border-accent/50 text-accent text-sm font-medium hover:bg-accent/10"
          >
            Add as new contact
          </button>
        </div>
      </div>
    </div>
  );
}
