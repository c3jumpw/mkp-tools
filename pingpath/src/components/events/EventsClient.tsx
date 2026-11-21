"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EventRow } from "@/lib/types";
import { createEvent, archiveEvent, deleteEvent } from "@/app/(app)/blasts/actions";

export default function EventsClient({ initialEvents }: { initialEvents: EventRow[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [pending, startTransition] = useTransition();

  const visible = initialEvents.filter((e) => showArchived || !e.archived);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-2xl md:text-3xl">Blasts</h1>
        <button
          onClick={() => setShowNew(true)}
          className="text-sm px-3 py-2 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover transition-colors"
        >
          + New blast
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-muted mb-4">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
        Show archived
      </label>

      <div className="space-y-3">
        {visible.length === 0 && (
          <p className="text-sm text-muted p-8 text-center border border-line rounded-xl">
            No blasts yet. Create one to start a message sequence.
          </p>
        )}
        {visible.map((e) => (
          <div
            key={e.id}
            className={`rounded-xl border border-line p-4 bg-surface/40 flex items-center gap-4 ${
              e.archived ? "opacity-60" : ""
            }`}
          >
            <Link href={`/blasts/${e.id}`} className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{e.name}</p>
              {e.description && (
                <p className="text-xs text-muted truncate mt-0.5">{e.description}</p>
              )}
              <p className="text-xs text-muted mt-1">
                {[
                  `${e.contact_count} contact${e.contact_count === 1 ? "" : "s"}`,
                  (e.sent_count ?? 0) > 0 ? `${e.sent_count} sent` : null,
                  (e.responded_count ?? 0) > 0 ? `${e.responded_count} responded` : null,
                  new Date(e.created_at).toLocaleDateString(),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </Link>
            <div className="flex gap-2 shrink-0">
              <button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await archiveEvent(e.id, !e.archived);
                    router.refresh();
                  })
                }
                className="text-xs text-muted hover:text-ink"
              >
                {e.archived ? "Unarchive" : "Archive"}
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  if (!confirm(`Delete "${e.name}" and its whole roster/history?`)) return;
                  startTransition(async () => {
                    await deleteEvent(e.id);
                    router.refresh();
                  });
                }}
                className="text-xs text-rust/70 hover:text-rust"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <NewEventModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => router.push(`/blasts/${id}`)}
        />
      )}
    </div>
  );
}

function NewEventModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      const event = await createEvent(name, String(formData.get("description") || ""));
      onCreated(event.id);
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <form
        action={handleSubmit}
        className="bg-surface border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 space-y-3"
      >
        <h2 className="font-display text-xl mb-1">New blast</h2>
        <div>
          <label className="block text-sm text-muted mb-1.5">Name</label>
          <input
            name="name"
            required
            placeholder="e.g. Q4 Outreach"
            className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <div>
          <label className="block text-sm text-muted mb-1.5">Description (optional)</label>
          <textarea
            name="description"
            rows={2}
            className="w-full rounded-lg bg-surface-2 border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
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
            {pending ? "Creating…" : "Create & add contacts"}
          </button>
        </div>
      </form>
    </div>
  );
}
