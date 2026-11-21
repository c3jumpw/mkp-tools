"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Contact, Tag } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { StatusDot, TagPill } from "@/components/ui";
import PhoneLabelInput from "@/components/PhoneLabelInput";
import {
  createContact,
  setContactStatus,
  setContactVisible,
  bulkAddTagToContacts,
  bulkDeleteContacts,
} from "@/app/(app)/contacts/actions";
import { addContactsToEvent } from "@/app/(app)/blasts/actions";

const SELECTION_STORAGE_KEY = "pingpath:contacts:selected";
const FILTERS_STORAGE_KEY = "pingpath:contacts:filters";

type BlastOption = { id: string; name: string };

export default function ContactsClient({
  initialContacts,
  allTags,
  allBlasts,
}: {
  initialContacts: Contact[];
  allTags: Tag[];
  allBlasts: BlastOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showHidden, setShowHidden] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectionRestored, setSelectionRestored] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, startTransition] = useTransition();

  // Restore the last-used search/filter view (so going into a contact and
  // back doesn't reset you to "all contacts" every time). Same hydration
  // consideration as the selection restore below: this has to happen after
  // mount, not as a lazy initializer.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          query?: string;
          tagFilter?: string;
          statusFilter?: string;
          showHidden?: boolean;
        };
        if (typeof saved.query === "string") {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external store (sessionStorage) on mount, not derivable from props/state
          setQuery(saved.query);
        }
        if (saved.tagFilter) setTagFilter(saved.tagFilter);
        if (saved.statusFilter) setStatusFilter(saved.statusFilter);
        if (typeof saved.showHidden === "boolean") setShowHidden(saved.showHidden);
      }
    } catch {
      // ignore malformed/unavailable storage
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ query, tagFilter, statusFilter, showHidden })
      );
    } catch {
      // ignore
    }
  }, [query, tagFilter, statusFilter, showHidden]);

  // Restore any selection left over from before navigating away (e.g. into
  // a contact's profile) so an accidental tap doesn't lose your picks. This
  // has to run post-mount (not as a lazy useState initializer) since
  // sessionStorage isn't available during server rendering and reading it
  // there would cause a hydration mismatch on the checkbox states.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SELECTION_STORAGE_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        const valid = ids.filter((id) => initialContacts.some((c) => c.id === id));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external store (sessionStorage) on mount, not derivable from props/state
        setSelected(new Set(valid));
      }
    } catch {
      // ignore malformed/unavailable storage
    }
    setSelectionRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectionRestored) return;
    try {
      sessionStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify([...selected]));
    } catch {
      // ignore
    }
  }, [selected, selectionRestored]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initialContacts.filter((c) => {
      if (!showHidden && !c.visible) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (tagFilter !== "all" && !c.tags?.some((t) => t.id === tagFilter)) return false;
      if (!q) return true;
      return (
        c.full_name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.phone2?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.instagram_handle?.toLowerCase().includes(q)
      );
    });
  }, [initialContacts, query, tagFilter, statusFilter, showHidden]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.id));
      } else {
        filtered.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  function bulkDelete() {
    const n = selected.size;
    if (
      !confirm(
        `Delete ${n} contact${n === 1 ? "" : "s"}? This can't be undone and removes them from any blasts and their history.`
      )
    )
      return;
    startTransition(async () => {
      await bulkDeleteContacts([...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  function bulkSetActive() {
    const n = selected.size;
    if (!confirm(`Mark ${n} contact${n === 1 ? "" : "s"} as active and visible?`)) return;
    startTransition(async () => {
      await Promise.all(
        [...selected].flatMap((id) => [
          setContactStatus(id, "active"),
          setContactVisible(id, true),
        ])
      );
      setSelected(new Set());
      router.refresh();
    });
  }

  function bulkHide() {
    const n = selected.size;
    if (!confirm(`Hide ${n} contact${n === 1 ? "" : "s"}?`)) return;
    startTransition(async () => {
      await Promise.all([...selected].map((id) => setContactVisible(id, false)));
      setSelected(new Set());
      router.refresh();
    });
  }

  function bulkAddTag(tagId: string) {
    const tag = allTags.find((t) => t.id === tagId);
    if (!tag) return;
    const n = selected.size;
    if (!confirm(`Add ${n} contact${n === 1 ? "" : "s"} to tag "${tag.name}"?`)) return;
    startTransition(async () => {
      await bulkAddTagToContacts([...selected], tagId);
      setSelected(new Set());
      router.refresh();
    });
  }

  function bulkAddBlast(blastId: string) {
    const blast = allBlasts.find((b) => b.id === blastId);
    if (!blast) return;
    const n = selected.size;
    if (!confirm(`Add ${n} contact${n === 1 ? "" : "s"} to blast "${blast.name}"?`)) return;
    startTransition(async () => {
      await addContactsToEvent(blastId, [...selected]);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl md:text-3xl">Contacts</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm px-3 py-2 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover transition-colors"
        >
          + Add contact
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, email, @handle…"
          className="flex-1 rounded-lg bg-surface border border-line px-3.5 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50"
        />
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="rounded-lg bg-surface border border-line px-3 py-2 text-sm"
        >
          <option value="all">All tags</option>
          {allTags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg bg-surface border border-line px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted px-1 whitespace-nowrap">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          Show hidden
        </label>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-lg bg-surface-2 border border-line text-sm">
          <span className="text-muted">{selected.size} selected</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) bulkAddTag(e.target.value);
              e.target.value = "";
            }}
            disabled={pending || allTags.length === 0}
            className="px-2.5 py-1 rounded-md border border-line bg-surface text-xs disabled:opacity-40"
          >
            <option value="" disabled>
              {allTags.length ? "Add to tag…" : "No tags yet"}
            </option>
            {allTags.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) bulkAddBlast(e.target.value);
              e.target.value = "";
            }}
            disabled={pending || allBlasts.length === 0}
            className="px-2.5 py-1 rounded-md border border-line bg-surface text-xs disabled:opacity-40"
          >
            <option value="" disabled>
              {allBlasts.length ? "Add to blast…" : "No blasts yet"}
            </option>
            {allBlasts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            disabled={pending}
            onClick={bulkHide}
            className="px-2.5 py-1 rounded-md border border-line hover:border-ink/50"
          >
            Hide
          </button>
          <button
            disabled={pending}
            onClick={bulkSetActive}
            className="px-2.5 py-1 rounded-md border border-line hover:border-moss/60 hover:text-moss"
          >
            Mark active
          </button>
          <button
            disabled={pending}
            onClick={bulkDelete}
            className="px-2.5 py-1 rounded-md border border-rust/50 text-rust hover:bg-rust/10"
          >
            Delete
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-muted hover:text-ink"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="rounded-xl border border-line overflow-hidden divide-y divide-line bg-surface/40">
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 text-xs text-muted">
            <span>
              {filtered.length} contact{filtered.length === 1 ? "" : "s"}
            </span>
            <button onClick={toggleSelectAll} className="text-accent hover:text-accent-hover">
              {allFilteredSelected ? "Deselect all" : "Select all"}
            </button>
          </div>
        )}
        {filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            No contacts match. Add one, import a list, or clear your filters.
          </p>
        )}
        {filtered.map((c) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-2/60 transition-colors ${
              !c.visible ? "opacity-50" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => toggleSelect(c.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <Link href={`/contacts/${c.id}`} className="flex-1 min-w-0 flex items-center gap-3">
              <StatusDot status={c.status} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.full_name}</p>
                <p className="text-xs text-muted truncate">
                  {c.phone || c.instagram_handle || c.email || "No contact info"}
                </p>
              </div>
              <div className="hidden sm:flex gap-1 ml-auto">
                {c.tags?.slice(0, 3).map((t) => (
                  <TagPill key={t.id} tag={t} />
                ))}
              </div>
            </Link>
          </div>
        ))}
      </div>

      {showAdd && (
        <AddContactModal
          allTags={allTags}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AddContactModal({
  allTags,
  onClose,
  onCreated,
}: {
  allTags: Tag[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [tagIds, setTagIds] = useState<Set<string>>(new Set());

  function handleSubmit(formData: FormData) {
    const full_name = String(formData.get("full_name") || "").trim();
    if (!full_name) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      try {
        await createContact({
          full_name,
          nickname: String(formData.get("nickname") || "").trim(),
          phone: String(formData.get("phone") || "").trim(),
          phone2: String(formData.get("phone2") || "").trim(),
          phone2_label: String(formData.get("phone2_label") || "").trim(),
          instagram_handle: String(formData.get("instagram_handle") || "").trim(),
          tiktok_handle: String(formData.get("tiktok_handle") || "").trim(),
          email: String(formData.get("email") || "").trim(),
          notes: String(formData.get("notes") || "").trim(),
          tagIds: [...tagIds],
        });
        onCreated();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <form
        action={handleSubmit}
        className="bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display text-xl mb-1">Add contact</h2>
        <Field name="full_name" label="Full name" required />
        <Field name="nickname" label="Nickname" placeholder="What you actually call them" />
        <Field name="phone" label="Phone" type="tel" placeholder="+1 555 123 4567" />
        <div className="grid grid-cols-2 gap-3">
          <Field name="phone2" label="Phone 2" type="tel" placeholder="Optional" />
          <div>
            <label htmlFor="add-phone2-label" className="block text-sm text-muted mb-1.5">
              Phone 2 label
            </label>
            <PhoneLabelInput
              id="add-phone2-label"
              name="phone2_label"
              inputClassName="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
        </div>
        <Field name="instagram_handle" label="Instagram handle" placeholder="@username" />
        <Field name="tiktok_handle" label="TikTok handle" placeholder="@username" />
        <Field name="email" label="Email" type="email" />
        <div>
          <label className="block text-sm text-muted mb-1.5">Notes</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        {allTags.length > 0 && (
          <div>
            <label className="block text-sm text-muted mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((t) => {
                const active = tagIds.has(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() =>
                      setTagIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      })
                    }
                    className="text-xs px-2 py-1 rounded-full border transition-opacity"
                    style={{
                      borderColor: t.color,
                      color: t.color,
                      opacity: active ? 1 : 0.4,
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-rust">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-line text-sm"
          >
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

function Field({
  name,
  label,
  type = "text",
  placeholder,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-muted mb-1.5">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
    </div>
  );
}
