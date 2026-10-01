"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { SessionItem } from "@/lib/database.types";

/**
 * A workout happens where the signal is worst — a basement squat rack, the far
 * side of a pitch. Ticking off a station must never fail in a way the user has
 * to think about, so writes go into a queue that survives a reload and flushes
 * when the network comes back.
 *
 * Every operation carries the timestamp from the moment of the tap, so a late
 * flush records when the set actually happened rather than when it synced.
 */

export type PendingOp =
  | { id: string; kind: "item_complete"; itemId: string; completedAt: string }
  | { id: string; kind: "item_reopen"; itemId: string }
  | { id: string; kind: "item_swap"; itemId: string; patch: Partial<SessionItem> }
  | { id: string; kind: "session_finish"; sessionId: string; completedAt: string };

const QUEUE_KEY = "cb.outbox.v1";

function read(): PendingOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingOp[]) : [];
  } catch {
    return [];
  }
}

function write(ops: PendingOp[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
  } catch {
    /* nothing useful to do if storage is unavailable */
  }
}

const listeners = new Set<(count: number) => void>();

function notify() {
  const count = read().length;
  listeners.forEach((fn) => fn(count));
}

export function onPendingChange(fn: (count: number) => void) {
  listeners.add(fn);
  fn(read().length);
  return () => listeners.delete(fn);
}

export function pendingCount() {
  return read().length;
}

/**
 * A plain Omit over a union collapses to the keys the members share, so it has
 * to distribute to keep each operation's own fields.
 */
type NewOp = PendingOp extends infer T ? (T extends PendingOp ? Omit<T, "id"> : never) : never;

export function enqueue(op: NewOp) {
  const ops = read();
  const withId = { ...op, id: crypto.randomUUID() } as PendingOp;

  // Completing and reopening the same station cancel out; keep only the latest
  // intent so a flaky tap does not replay a dozen writes.
  const filtered = ops.filter((existing) => {
    if (
      (withId.kind === "item_complete" || withId.kind === "item_reopen") &&
      (existing.kind === "item_complete" || existing.kind === "item_reopen")
    ) {
      return existing.itemId !== withId.itemId;
    }
    return true;
  });

  filtered.push(withId);
  write(filtered);
  notify();
}

let flushing = false;

/**
 * Drain the queue. Stops at the first failure and leaves the rest in place so
 * ordering holds; the next online event or interval tick retries.
 */
export async function flush(): Promise<{ sent: number; remaining: number }> {
  if (flushing) return { sent: 0, remaining: read().length };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { sent: 0, remaining: read().length };
  }

  flushing = true;
  const supabase = supabaseBrowser();
  let sent = 0;

  try {
    let ops = read();
    while (ops.length > 0) {
      const op = ops[0];
      try {
        if (op.kind === "item_complete") {
          const { error } = await supabase
            .from("cb_session_items")
            .update({ completed_at: op.completedAt })
            .eq("id", op.itemId);
          if (error) throw error;
        } else if (op.kind === "item_reopen") {
          const { error } = await supabase
            .from("cb_session_items")
            .update({ completed_at: null })
            .eq("id", op.itemId);
          if (error) throw error;
        } else if (op.kind === "item_swap") {
          const { error } = await supabase
            .from("cb_session_items")
            .update(op.patch)
            .eq("id", op.itemId);
          if (error) throw error;
        } else if (op.kind === "session_finish") {
          const { error } = await supabase
            .from("cb_sessions")
            .update({ completed_at: op.completedAt })
            .eq("id", op.sessionId);
          if (error) throw error;
        }
      } catch {
        break;
      }

      ops = read().filter((o) => o.id !== op.id);
      write(ops);
      sent += 1;
    }
  } finally {
    flushing = false;
    notify();
  }

  return { sent, remaining: read().length };
}

/** Start flushing on reconnect, on tab focus, and on a slow background timer. */
export function startOutboxWatcher() {
  if (typeof window === "undefined") return () => {};

  const run = () => void flush();
  window.addEventListener("online", run);
  window.addEventListener("focus", run);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") run();
  });
  const timer = window.setInterval(run, 30_000);
  run();

  return () => {
    window.removeEventListener("online", run);
    window.removeEventListener("focus", run);
    window.clearInterval(timer);
  };
}

/* ------------------------------------------------------------------------- */
/* Session snapshot                                                          */
/* ------------------------------------------------------------------------- */

const SNAPSHOT_PREFIX = "cb.session.v1.";

/**
 * Keep the running session on the device so closing the app mid-workout, or
 * losing signal entirely, does not lose the card you were on.
 */
export function saveSnapshot(sessionId: string, payload: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SNAPSHOT_PREFIX + sessionId, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function loadSnapshot<T>(sessionId: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearSnapshot(sessionId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SNAPSHOT_PREFIX + sessionId);
  } catch {
    /* ignore */
  }
}
