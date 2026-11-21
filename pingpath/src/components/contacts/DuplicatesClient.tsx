"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Contact } from "@/lib/types";
import { TagPill } from "@/components/ui";
import { bulkDeleteContacts } from "@/app/(app)/contacts/actions";

function normPhone(p: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/\D/g, "");
  const trimmed = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return trimmed.length >= 7 ? trimmed : null;
}

function normEmail(e: string | null): string | null {
  const v = e?.trim().toLowerCase();
  return v || null;
}

function normName(n: string): string {
  return n.trim().toLowerCase().replace(/\s+/g, " ");
}

type Cluster = { id: string; contacts: Contact[]; reasons: string[] };

function buildClusters(contacts: Contact[]): Cluster[] {
  const parent = new Map<string, string>();
  contacts.forEach((c) => parent.set(c.id, c.id));

  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = x;
    while (parent.get(cur) !== cur) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  const byKey = new Map<string, string[]>();
  function addKey(key: string | null, id: string) {
    if (!key) return;
    const arr = byKey.get(key) || [];
    arr.push(id);
    byKey.set(key, arr);
  }

  for (const c of contacts) {
    addKey(normPhone(c.phone) && `phone:${normPhone(c.phone)}`, c.id);
    addKey(normPhone(c.phone2) && `phone:${normPhone(c.phone2)}`, c.id);
    addKey(normEmail(c.email) && `email:${normEmail(c.email)}`, c.id);
    addKey(`name:${normName(c.full_name)}`, c.id);
  }

  for (const ids of byKey.values()) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }

  const groups = new Map<string, string[]>();
  for (const c of contacts) {
    const root = find(c.id);
    const arr = groups.get(root) || [];
    arr.push(c.id);
    groups.set(root, arr);
  }

  const byId = new Map(contacts.map((c) => [c.id, c]));
  const clusters: Cluster[] = [];
  for (const [root, ids] of groups) {
    if (ids.length < 2) continue;
    const members = ids
      .map((id) => byId.get(id)!)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const reasons: string[] = [];
    const phones = members.flatMap((m) => [normPhone(m.phone), normPhone(m.phone2)]).filter(Boolean);
    if (new Set(phones).size < phones.length) reasons.push("same phone");
    const emails = members.map((m) => normEmail(m.email)).filter(Boolean);
    if (new Set(emails).size < emails.length) reasons.push("same email");
    const names = members.map((m) => normName(m.full_name));
    if (new Set(names).size < names.length) reasons.push("same name");

    clusters.push({ id: root, contacts: members, reasons });
  }

  clusters.sort((a, b) => a.contacts[0].full_name.localeCompare(b.contacts[0].full_name));
  return clusters;
}

export default function DuplicatesClient({ contacts }: { contacts: Contact[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const allClusters = useMemo(() => buildClusters(contacts), [contacts]);
  const clusters = allClusters.filter((c) => !dismissed.has(c.id));

  // Default selection: everything except the oldest contact in each group.
  const [toDelete, setToDelete] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const cluster of allClusters) {
      cluster.contacts.slice(1).forEach((c) => initial.add(c.id));
    }
    return initial;
  });

  function toggle(id: string) {
    setToDelete((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function dismissCluster(clusterId: string, memberIds: string[]) {
    setDismissed((prev) => new Set(prev).add(clusterId));
    setToDelete((prev) => {
      const next = new Set(prev);
      memberIds.forEach((id) => next.delete(id));
      return next;
    });
  }

  const selectedCount = [...toDelete].filter((id) =>
    clusters.some((c) => c.contacts.some((m) => m.id === id))
  ).length;

  function handleDelete() {
    const ids = [...toDelete].filter((id) =>
      clusters.some((c) => c.contacts.some((m) => m.id === id))
    );
    if (ids.length === 0) return;
    if (
      !confirm(
        `Delete ${ids.length} contact${ids.length === 1 ? "" : "s"}? This can't be undone and removes them from any blasts and their history.`
      )
    )
      return;
    startTransition(async () => {
      await bulkDeleteContacts(ids);
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <Link href="/settings" className="text-sm text-muted hover:text-ink">
        ← Settings
      </Link>
      <div className="flex items-center justify-between gap-3 mt-3 mb-2">
        <h1 className="font-display text-2xl md:text-3xl">Find duplicates</h1>
      </div>
      <p className="text-sm text-muted mb-6">
        Grouped by matching phone, email, or exact name across your {contacts.length} contacts.
        Review each group — the oldest entry is pre-kept, everything else is pre-checked for
        deletion, but nothing happens until you confirm.
      </p>

      {clusters.length === 0 ? (
        <p className="rounded-xl border border-line p-8 text-center text-sm text-muted">
          No likely duplicates found.
        </p>
      ) : (
        <>
          <div className="sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-bg/90 backdrop-blur border-b border-line mb-4 flex items-center justify-between">
            <span className="text-sm text-muted">
              {clusters.length} group{clusters.length === 1 ? "" : "s"} · {selectedCount} selected
            </span>
            <button
              onClick={handleDelete}
              disabled={pending || selectedCount === 0}
              className="text-sm px-3 py-2 rounded-lg bg-rust text-bg font-medium hover:opacity-90 disabled:opacity-40"
            >
              {pending ? "Deleting…" : `Delete ${selectedCount || ""}`.trim()}
            </button>
          </div>

          <div className="space-y-4">
            {clusters.map((cluster) => (
              <div key={cluster.id} className="rounded-xl border border-line overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-surface-2 text-xs text-muted">
                  <span>{cluster.reasons.join(" · ") || "possible match"}</span>
                  <button
                    onClick={() =>
                      dismissCluster(
                        cluster.id,
                        cluster.contacts.map((c) => c.id)
                      )
                    }
                    className="text-muted hover:text-ink"
                  >
                    Not duplicates — dismiss
                  </button>
                </div>
                <div className="divide-y divide-line">
                  {cluster.contacts.map((c, i) => (
                    <label
                      key={c.id}
                      className="flex items-start gap-3 px-4 py-3 cursor-pointer active:bg-surface-2/60"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 w-5 h-5 shrink-0"
                        checked={toDelete.has(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/contacts/${c.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-sm font-medium hover:text-accent"
                          >
                            {c.full_name}
                          </Link>
                          {i === 0 && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-moss/15 text-moss">
                              Oldest · suggested keep
                            </span>
                          )}
                          {c.tags?.slice(0, 3).map((t) => (
                            <TagPill key={t.id} tag={t} />
                          ))}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {[c.phone, c.email, c.instagram_handle && `@${c.instagram_handle}`]
                            .filter(Boolean)
                            .join(" · ") || "No contact info"}
                        </p>
                        <p className="text-[11px] text-muted/70 mt-0.5">
                          Added {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
