"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Contact, Tag } from "@/lib/types";
import { formatMonthDay, normalizeName } from "@/lib/occasions";
import { bulkAddTagToContacts } from "@/app/(app)/contacts/actions";
import ContactEditSheet from "@/components/contacts/ContactEditSheet";

export type PickerContact = { id: string; full_name: string; nickname: string | null; phone: string | null };
export type BirthdayInfo = { id: string; month: number; day: number; year: number | null; source: "manual" | "calendar" };

const CONTACTS_FILTERS_KEY = "pingpath:contacts:filters";

/** One tag's people: search them, edit any of them in place, add or remove members. */
export default function TagDetailClient({
  tag,
  members,
  allContacts,
  birthdays,
}: {
  tag: Tag;
  members: Contact[];
  allContacts: PickerContact[];
  birthdays: Record<string, BirthdayInfo>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const shown = useMemo(() => {
    const q = normalizeName(query);
    const digits = query.replace(/\D/g, "");
    if (!q && !digits) return members;
    return members.filter(
      (c) =>
        (q && normalizeName(c.full_name).includes(q)) ||
        (q && c.nickname && normalizeName(c.nickname).includes(q)) ||
        (digits.length >= 3 && `${c.phone || ""} ${c.phone2 || ""}`.replace(/\D/g, "").includes(digits)) ||
        (q && c.email?.toLowerCase().includes(query.trim().toLowerCase()))
    );
  }, [members, query]);

  /** Opens the main Contacts list pre-filtered to this tag, for bulk actions. */
  function openInContacts() {
    try {
      sessionStorage.setItem(
        CONTACTS_FILTERS_KEY,
        JSON.stringify({ query: "", tagFilter: tag.id, statusFilter: "all", showHidden: true })
      );
    } catch {
      // storage unavailable: the list just opens unfiltered
    }
    router.push("/contacts");
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <Link href="/tags" className="text-sm text-muted hover:text-ink">
        ← Tags
      </Link>

      <div className="flex items-start justify-between gap-3 mt-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2.5 min-w-0">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: tag.color }} />
            <span className="truncate">{tag.name}</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">
            {members.length} contact{members.length === 1 ? "" : "s"} · tap anyone to edit
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="shrink-0 rounded-lg bg-accent text-bg px-3.5 py-2 text-sm font-medium hover:bg-accent-hover"
        >
          + Add people
        </button>
      </div>

      {members.length > 6 && (
        <input
          id="tag-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${tag.name}`}
          className="w-full rounded-lg bg-surface border border-line px-3.5 py-2 text-sm mb-3 placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
      )}

      <ul className="rounded-xl border border-line divide-y divide-line bg-surface/40 overflow-hidden">
        {members.length === 0 && (
          <li className="p-6 text-center text-sm text-muted">
            No one has this tag yet.{" "}
            <button onClick={() => setAdding(true)} className="text-accent">
              Add people
            </button>
          </li>
        )}
        {members.length > 0 && shown.length === 0 && (
          <li className="p-6 text-center text-sm text-muted">No one in this tag matches “{query}”.</li>
        )}
        {shown.map((c) => {
          const b = birthdays[c.id];
          const details = [
            c.phone,
            c.phone2 ? `${c.phone2_label?.trim() || "Phone 2"}: ${c.phone2}` : null,
            !c.phone && !c.phone2 ? c.email || c.instagram_handle || "No contact info" : null,
          ].filter(Boolean);
          return (
            <li key={c.id}>
              <button
                onClick={() => setEditing(c)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60 transition-colors ${
                  !c.visible ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {c.full_name}
                    {c.nickname && <span className="text-muted font-normal"> · {c.nickname}</span>}
                  </p>
                  <p className="text-xs text-muted truncate">{details.join(" · ")}</p>
                </div>
                {b && (
                  <span className="text-[11px] text-accent shrink-0 hidden min-[380px]:inline">
                    🎂 {formatMonthDay(b.month, b.day)}
                  </span>
                )}
                {!c.visible && <span className="text-[11px] text-muted shrink-0">Hidden</span>}
                <span className="text-xs text-muted shrink-0" aria-hidden>
                  Edit ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {members.length > 0 && (
        <button onClick={openInContacts} className="text-xs text-muted hover:text-ink mt-3">
          Open this tag in Contacts for bulk actions (add to a blast, hide, delete) →
        </button>
      )}

      {editing && (
        <ContactEditSheet
          contact={editing}
          birthday={birthdays[editing.id] ?? null}
          tag={{ id: tag.id, name: tag.name }}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setToast(msg);
            router.refresh();
          }}
        />
      )}

      {adding && (
        <AddPeopleSheet
          tag={tag}
          candidates={allContacts.filter((c) => !members.some((m) => m.id === c.id))}
          onClose={() => setAdding(false)}
          onAdded={(n) => {
            setAdding(false);
            setToast(`Added ${n} ${n === 1 ? "person" : "people"} to ${tag.name}`);
            router.refresh();
          }}
        />
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] md:bottom-6 z-50 rounded-full bg-surface-2 border border-line px-4 py-2 text-sm shadow-lg max-w-[calc(100%-2rem)] truncate">
          {toast}
        </div>
      )}
    </div>
  );
}

function AddPeopleSheet({
  tag,
  candidates,
  onClose,
  onAdded,
}: {
  tag: Tag;
  candidates: PickerContact[];
  onClose: () => void;
  onAdded: (n: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const results = useMemo(() => {
    const q = normalizeName(query);
    const list = q
      ? candidates.filter(
          (c) => normalizeName(c.full_name).includes(q) || (c.nickname && normalizeName(c.nickname).includes(q))
        )
      : candidates;
    return list.slice(0, 60);
  }, [candidates, query]);

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function add() {
    if (!picked.size) return;
    setError("");
    startTransition(async () => {
      try {
        await bulkAddTagToContacts([...picked], tag.id);
        onAdded(picked.size);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't add them.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col p-5 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <h2 className="font-display text-xl mb-3">Add people to {tag.name}</h2>
        <input
          id="add-people-search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts"
          className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <ul className="overflow-y-auto flex-1 min-h-0 -mx-1">
          {results.map((c) => {
            const on = picked.has(c.id);
            return (
              <li key={c.id}>
                <label className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-2 cursor-pointer">
                  <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="w-4 h-4 shrink-0" />
                  <span className="text-sm truncate flex-1">
                    {c.full_name}
                    {c.nickname && <span className="text-muted"> · {c.nickname}</span>}
                  </span>
                  {c.phone && <span className="text-xs text-muted shrink-0">{c.phone}</span>}
                </label>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="text-sm text-muted px-2 py-3">
              {candidates.length ? "No contacts match." : "Everyone already has this tag."}
            </li>
          )}
        </ul>
        {!query && candidates.length > results.length && (
          <p className="text-[11px] text-muted mt-1">Showing the first {results.length}. Search to find others.</p>
        )}
        {error && <p className="text-sm text-rust mt-2">{error}</p>}
        <div className="flex gap-2 pt-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-line text-sm">
            Cancel
          </button>
          <button
            onClick={add}
            disabled={pending || !picked.size}
            className="flex-1 py-2.5 rounded-lg bg-accent text-bg text-sm font-medium hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Adding…" : picked.size ? `Add ${picked.size}` : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
