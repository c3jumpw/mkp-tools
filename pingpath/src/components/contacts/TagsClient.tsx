"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createTag, updateTag, deleteTag } from "@/app/(app)/contacts/actions";

const SWATCHES = ["#4F9C8C", "#CB9A45", "#7FA65A", "#C1583C", "#8AA0C9", "#B084C4"];

type TagWithCount = { id: string; name: string; color: string; count: number };

export default function TagsClient({ initialTags }: { initialTags: TagWithCount[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleCreate() {
    if (!name.trim()) return;
    setError("");
    startTransition(async () => {
      try {
        await createTag(name.trim(), color);
        setName("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't create that tag.");
      }
    });
  }

  function handleDelete(tag: TagWithCount) {
    const msg =
      tag.count > 0
        ? `Delete "${tag.name}"? It's on ${tag.count} contact${tag.count === 1 ? "" : "s"} — this only removes the tag, not the contacts.`
        : `Delete "${tag.name}"?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      await deleteTag(tag.id);
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <h1 className="font-display text-2xl md:text-3xl mb-2">Tags</h1>
      <p className="text-sm text-muted mb-6">
        Categorize contacts, then pull a whole tag into a blast roster in one click. Tap a tag to see and
        edit the people in it.
      </p>

      <div className="rounded-xl border border-line p-4 bg-surface/40 mb-6">
        <label className="block text-xs text-muted mb-1.5">New tag</label>
        <div className="flex gap-2 mb-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. warm-lead"
            className="flex-1 rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <button
            onClick={handleCreate}
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-accent text-bg text-sm font-medium hover:bg-accent-hover disabled:opacity-60"
          >
            Add
          </button>
        </div>
        <SwatchPicker value={color} onChange={setColor} />
        {error && <p className="text-sm text-rust mt-2">{error}</p>}
      </div>

      <div className="rounded-xl border border-line divide-y divide-line overflow-hidden">
        {initialTags.length === 0 && (
          <p className="p-6 text-center text-sm text-muted">No tags yet.</p>
        )}
        {initialTags.map((t) =>
          editingId === t.id ? (
            <EditTagRow
              key={t.id}
              tag={t}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                router.refresh();
              }}
            />
          ) : (
            <div key={t.id} className="flex items-center gap-3 pr-4 hover:bg-surface-2/60 transition-colors">
              <Link
                href={`/tags/${t.id}`}
                className="flex-1 min-w-0 flex items-center gap-3 pl-4 py-3"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: t.color }}
                />
                <span className="text-sm flex-1 truncate">{t.name}</span>
                <span className="text-xs text-muted shrink-0">
                  {t.count} contact{t.count === 1 ? "" : "s"} ›
                </span>
              </Link>
              <button
                onClick={() => setEditingId(t.id)}
                className="text-xs text-muted hover:text-ink ml-2"
              >
                Rename
              </button>
              <button
                onClick={() => handleDelete(t)}
                className="text-xs text-rust/70 hover:text-rust"
              >
                Delete
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function EditTagRow({
  tag,
  onCancel,
  onSaved,
}: {
  tag: TagWithCount;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function save() {
    if (!name.trim()) {
      setError("Name can't be empty.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await updateTag(tag.id, { name: name.trim(), color });
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't save that tag.");
      }
    });
  }

  return (
    <div className="px-4 py-3 space-y-2.5 bg-surface-2/40">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        autoFocus
        className="w-full rounded-lg bg-surface border border-line px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
      <SwatchPicker value={color} onChange={setColor} />
      {error && <p className="text-xs text-rust">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md border border-line text-xs"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={pending}
          className="px-3 py-1.5 rounded-md bg-accent text-bg text-xs font-medium hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function SwatchPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {SWATCHES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className="w-6 h-6 rounded-full border-2"
          style={{ background: s, borderColor: value === s ? "var(--ink)" : "transparent" }}
          aria-label={s}
        />
      ))}
    </div>
  );
}
