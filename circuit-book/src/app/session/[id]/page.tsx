"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Session, SessionItem, Workout } from "@/lib/database.types";
import { byPosition, formatTarget } from "@/lib/format";
import { clearSnapshot, enqueue, flush, loadSnapshot, saveSnapshot } from "@/lib/outbox";
import StationCard, { CheckIcon } from "@/components/StationCard";
import Thumb from "@/components/Thumb";
import { Button, LoadingPanel, Notice, Sheet, Spinner } from "@/components/ui";

type Snapshot = { session: Session; items: SessionItem[] };

/**
 * Session mode. The whole display belongs to one station, because this screen
 * gets read at arm's length by someone out of breath. Everything that is not
 * the station number, the target, or the button is quiet.
 */
export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [library, setLibrary] = useState<Workout[]>([]);
  const [confirmQuit, setConfirmQuit] = useState(false);

  const strip = useRef<HTMLDivElement>(null);
  const userId = useRef<string | null>(null);

  /* --- Load ---------------------------------------------------------- */

  useEffect(() => {
    let active = true;

    // Paint from the local snapshot first so a dead connection still shows the
    // session the user is standing in the middle of.
    const cached = loadSnapshot<Snapshot>(sessionId);
    if (cached) {
      setSession(cached.session);
      setItems(byPosition(cached.items));
      setLoading(false);
    }

    (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) userId.current = user.id;

      const [sessionRes, itemsRes, libraryRes] = await Promise.all([
        supabase.from("cb_sessions").select("*").eq("id", sessionId).single(),
        supabase.from("cb_session_items").select("*").eq("session_id", sessionId),
        supabase.from("cb_workouts").select("*").order("name"),
      ]);

      if (!active) return;

      if (sessionRes.error || !sessionRes.data) {
        if (!cached) setError("That session is not there any more.");
        setLoading(false);
        return;
      }

      const loaded = byPosition(itemsRes.data ?? []);
      setSession(sessionRes.data);
      setItems(loaded);
      setLibrary(libraryRes.data ?? []);
      saveSnapshot(sessionId, { session: sessionRes.data, items: loaded });
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [sessionId]);

  // Open on the first station that still needs doing.
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || items.length === 0) return;
    landed.current = true;
    const firstOpen = items.findIndex((i) => !i.completed_at);
    const target = firstOpen === -1 ? items.length - 1 : firstOpen;
    setIndex(target);
    requestAnimationFrame(() => {
      const node = strip.current;
      if (node) node.scrollLeft = target * node.clientWidth;
    });
  }, [items]);

  useEffect(() => {
    if (session && items.length > 0) saveSnapshot(sessionId, { session, items });
  }, [session, items, sessionId]);

  const done = useMemo(() => items.filter((i) => i.completed_at).length, [items]);
  const allDone = items.length > 0 && done === items.length;
  const current = items[index];

  /* --- Interactions --------------------------------------------------- */

  const goTo = useCallback((next: number) => {
    const node = strip.current;
    if (!node) return;
    node.scrollTo({ left: next * node.clientWidth, behavior: "smooth" });
  }, []);

  function onScroll() {
    const node = strip.current;
    if (!node || node.clientWidth === 0) return;
    const next = Math.round(node.scrollLeft / node.clientWidth);
    if (next !== index && next >= 0 && next < items.length) setIndex(next);
  }

  function toggleDone(item: SessionItem) {
    const nowDone = !item.completed_at;
    const completedAt = new Date().toISOString();

    setItems((list) =>
      list.map((i) =>
        i.id === item.id ? { ...i, completed_at: nowDone ? completedAt : null } : i,
      ),
    );

    enqueue(
      nowDone
        ? { kind: "item_complete", itemId: item.id, completedAt }
        : { kind: "item_reopen", itemId: item.id },
    );
    void flush();

    if (nowDone) {
      // Move to the next station that is still open, so the common case is a
      // single tap per station with no navigation in between.
      const after = items.findIndex((i, n) => n > index && !i.completed_at && i.id !== item.id);
      const before = items.findIndex((i) => !i.completed_at && i.id !== item.id);
      const next = after !== -1 ? after : before;
      if (next !== -1) setTimeout(() => goTo(next), 180);
    }
  }

  function swapStation(workout: Workout) {
    if (!current) return;
    const patch = {
      workout_id: workout.id,
      workout_name: workout.name,
      description: workout.description,
      category: workout.category,
      target_sets: workout.target_sets,
      target_reps: workout.target_reps,
      target_duration_seconds: workout.target_duration_seconds,
      image_path: workout.image_path,
      swapped_from: current.workout_name,
      completed_at: null,
    };

    setItems((list) => list.map((i) => (i.id === current.id ? { ...i, ...patch } : i)));
    setSwapping(false);
    enqueue({ kind: "item_swap", itemId: current.id, patch });
    void flush();
  }

  async function finish() {
    setFinishing(true);
    const completedAt = new Date().toISOString();
    enqueue({ kind: "session_finish", sessionId, completedAt });
    await flush();
    clearSnapshot(sessionId);
    router.replace(`/history?just=${sessionId}`);
  }

  /* --- Render ---------------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-dvh">
        <LoadingPanel label="Loading session" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-dvh px-4 py-10">
        <Notice>{error ?? "That session is not there any more."}</Notice>
        <div className="mt-5">
          <Link href="/today" className="text-sm text-lime underline underline-offset-4">
            Back to today
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-base">
      {/* Header: progress is the only chrome ----------------------------- */}
      <header className="pad-safe-t shrink-0 px-4 pt-3">
        <div className="mx-auto w-full max-w-lg">
          <div className="flex items-center justify-between gap-3">
            <p className="ex min-w-0 truncate text-sm font-semibold text-muted">
              {session.routine_name}
            </p>
            <button
              type="button"
              onClick={() => setConfirmQuit(true)}
              className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted active:bg-raise"
              aria-label="Leave this session"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {/* One tick per station — the same mark as the app icon. */}
          <div className="mt-2.5 flex gap-1" role="group" aria-label="Stations">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Station ${i + 1}, ${item.workout_name}${
                  item.completed_at ? ", done" : ""
                }`}
                aria-current={i === index ? "true" : undefined}
                className="group h-6 flex-1 pt-2"
              >
                <span
                  className={`block h-1.5 rounded-full transition-colors ${
                    item.completed_at
                      ? "tick-done bg-lime"
                      : i === index
                        ? "bg-chalk"
                        : "bg-line"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* The placards ---------------------------------------------------- */}
      <div
        ref={strip}
        onScroll={onScroll}
        className="snap-x-strip flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
      >
        {items.map((item, i) => (
          <StationCard key={item.id} item={item} number={i + 1} total={items.length} />
        ))}
      </div>

      {/* Action bar ------------------------------------------------------- */}
      <footer className="shrink-0 border-t border-line-soft bg-base px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="mx-auto w-full max-w-lg">
          {allDone ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted">
                All {items.length} stations done. Nice work.
              </p>
              <Button size="lg" onClick={finish} disabled={finishing}>
                {finishing && <Spinner />}
                Finish session
              </Button>
            </div>
          ) : (
            current && (
              <>
                <Button
                  size="lg"
                  variant={current.completed_at ? "outline" : "primary"}
                  onClick={() => toggleDone(current)}
                >
                  {current.completed_at ? (
                    "Mark as not done"
                  ) : (
                    <>
                      <CheckIcon />
                      Done
                    </>
                  )}
                </Button>

                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSwapping(true)}
                    className="min-h-11 px-1 text-sm font-medium text-muted"
                  >
                    Swap station
                  </button>
                  <span className="tnum text-sm text-muted">
                    {done} of {items.length} done
                  </span>
                  <button
                    type="button"
                    onClick={finish}
                    className="min-h-11 px-1 text-sm font-medium text-muted"
                  >
                    End early
                  </button>
                </div>
              </>
            )
          )}
        </div>
      </footer>

      {/* Swap ------------------------------------------------------------- */}
      <SwapSheet
        open={swapping}
        library={library}
        currentName={current?.workout_name ?? ""}
        onClose={() => setSwapping(false)}
        onPick={swapStation}
      />

      {/* Leaving ---------------------------------------------------------- */}
      <Sheet open={confirmQuit} onClose={() => setConfirmQuit(false)} title="Leave this session?">
        <p className="text-sm leading-relaxed text-muted">
          Everything you have ticked off stays saved. You can pick this session back up from
          Today, or finish it now and log it.
        </p>
        <div className="mt-6 space-y-2.5">
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setConfirmQuit(false);
              router.push("/today");
            }}
          >
            Leave it running
          </Button>
          <Button size="lg" onClick={finish} disabled={finishing}>
            {finishing && <Spinner />}
            Finish and log it
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Swap                                                               */
/* ------------------------------------------------------------------ */

function SwapSheet({
  open,
  library,
  currentName,
  onClose,
  onPick,
}: {
  open: boolean;
  library: Workout[];
  currentName: string;
  onClose: () => void;
  onPick: (workout: Workout) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((w) => w.name.toLowerCase() !== currentName.toLowerCase() &&
      (!q || w.name.toLowerCase().includes(q)));
  }, [library, query, currentName]);

  return (
    <Sheet open={open} onClose={onClose} title="Swap this station">
      <p className="mb-4 text-sm leading-relaxed text-muted">
        Replaces {currentName} for this session only. Your routine stays as it is.
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search workouts"
        aria-label="Search workouts"
        className="min-h-12 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-chalk placeholder:text-faint focus:border-lime focus:outline-none"
      />

      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          Nothing else in the library to swap in.
        </p>
      ) : (
        <ul className="mt-3">
          {visible.map((workout) => (
            <li key={workout.id} className="border-b border-line-soft last:border-0">
              <button
                type="button"
                onClick={() => onPick(workout)}
                className="flex w-full items-center gap-3 py-2.5 text-left active:bg-surface"
              >
                <Thumb path={workout.image_path} alt="" className="h-11 w-11 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{workout.name}</span>
                  {(() => {
                    const t = formatTarget({
                      sets: workout.target_sets,
                      reps: workout.target_reps,
                      durationSeconds: workout.target_duration_seconds,
                    });
                    return t ? <span className="tnum text-sm text-muted">{t}</span> : null;
                  })()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
