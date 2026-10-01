"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import type {
  Session,
  SessionBlock,
  SessionBlockWithItems,
  SessionItem,
  SessionSet,
  Workout,
} from "@/lib/database.types";
import { byPosition, formatTarget } from "@/lib/format";
import { clearSnapshot, enqueue, flush, loadSnapshot, saveSnapshot } from "@/lib/outbox";
import BlockCard, { CheckIcon, setKey, type SetKey } from "@/components/BlockCard";
import Thumb from "@/components/Thumb";
import { Button, LoadingPanel, Notice, Sheet, Spinner } from "@/components/ui";

type Snapshot = {
  session: Session;
  blocks: SessionBlock[];
  items: SessionItem[];
  done: SetKey[];
};

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [done, setDone] = useState<Set<SetKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [library, setLibrary] = useState<Workout[]>([]);
  const [confirmQuit, setConfirmQuit] = useState(false);

  const strip = useRef<HTMLDivElement>(null);

  /* --- Load ---------------------------------------------------------- */

  useEffect(() => {
    let active = true;

    // Paint from the device first so a dead connection still shows the session
    // you are standing in the middle of.
    const cached = loadSnapshot<Snapshot>(sessionId);
    if (cached) {
      setSession(cached.session);
      setBlocks(cached.blocks);
      setItems(cached.items);
      setDone(new Set(cached.done));
      setLoading(false);
    }

    (async () => {
      const supabase = supabaseBrowser();

      const [sessionRes, blocksRes, itemsRes, setsRes, libraryRes] = await Promise.all([
        supabase.from("cb_sessions").select("*").eq("id", sessionId).single(),
        supabase.from("cb_session_blocks").select("*").eq("session_id", sessionId),
        supabase.from("cb_session_items").select("*").eq("session_id", sessionId),
        supabase.from("cb_session_sets").select("*").eq("session_id", sessionId),
        supabase.from("cb_workouts").select("*").order("name"),
      ]);

      if (!active) return;

      if (sessionRes.error || !sessionRes.data) {
        if (!cached) setError("That session is not there any more.");
        setLoading(false);
        return;
      }

      const loadedBlocks = byPosition(blocksRes.data ?? []);
      const loadedItems = itemsRes.data ?? [];
      const loadedDone = new Set(
        (setsRes.data ?? []).map((s: SessionSet) => setKey(s.session_item_id, s.round_number)),
      );

      setSession(sessionRes.data);
      setBlocks(loadedBlocks);
      setItems(loadedItems);
      setDone(loadedDone);
      setLibrary(libraryRes.data ?? []);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [sessionId]);

  /** Blocks with their exercises attached, in the order they are performed. */
  const grouped: SessionBlockWithItems[] = useMemo(
    () =>
      blocks.map((block) => ({
        ...block,
        items: byPosition(items.filter((i) => i.block_id === block.id)),
      })),
    [blocks, items],
  );

  const totalSets = useMemo(
    () => grouped.reduce((sum, b) => sum + b.items.length * b.rounds, 0),
    [grouped],
  );
  const doneSets = done.size;
  const allDone = totalSets > 0 && doneSets >= totalSets;
  const current = grouped[index];

  // Open on the first block that still has work in it.
  const landed = useRef(false);
  useEffect(() => {
    if (landed.current || grouped.length === 0) return;
    landed.current = true;
    const firstOpen = grouped.findIndex((b) =>
      b.items.some((i) => Array.from({ length: b.rounds }, (_, r) => r + 1).some(
        (round) => !done.has(setKey(i.id, round)),
      )),
    );
    const target = firstOpen === -1 ? grouped.length - 1 : firstOpen;
    setIndex(target);
    requestAnimationFrame(() => {
      const node = strip.current;
      if (node) node.scrollLeft = target * node.clientWidth;
    });
  }, [grouped, done]);

  useEffect(() => {
    if (session && blocks.length > 0) {
      saveSnapshot(sessionId, { session, blocks, items, done: Array.from(done) });
    }
  }, [session, blocks, items, done, sessionId]);

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
    if (next !== index && next >= 0 && next < grouped.length) setIndex(next);
  }

  const toggleSet = useCallback(
    (item: SessionItem, round: number) => {
      const key = setKey(item.id, round);
      const wasDone = done.has(key);

      setDone((prev) => {
        const next = new Set(prev);
        if (wasDone) next.delete(key);
        else next.add(key);
        return next;
      });

      enqueue(
        wasDone
          ? { kind: "set_reopen", itemId: item.id, round }
          : {
              kind: "set_complete",
              sessionId,
              itemId: item.id,
              round,
              completedAt: new Date().toISOString(),
            },
      );
      void flush();
    },
    [done, sessionId],
  );

  /**
   * The fast path: finish every exercise in the round you are on. One tap for
   * a straight set, one tap for a whole superset round.
   */
  function completeRound() {
    if (!current) return;
    const rounds = Array.from({ length: current.rounds }, (_, i) => i + 1);
    const round =
      rounds.find((r) => current.items.some((i) => !done.has(setKey(i.id, r)))) ?? null;
    if (round === null) return;

    const completedAt = new Date().toISOString();
    const added: SetKey[] = [];

    current.items.forEach((item) => {
      const key = setKey(item.id, round);
      if (done.has(key)) return;
      added.push(key);
      enqueue({ kind: "set_complete", sessionId, itemId: item.id, round, completedAt });
    });

    if (added.length === 0) return;
    setDone((prev) => new Set([...prev, ...added]));
    void flush();

    // If that finished the block, slide to the next one with work left.
    const blockFinished = round === current.rounds;
    if (blockFinished) {
      const next = grouped.findIndex(
        (b, n) =>
          n !== index &&
          b.items.some((i) =>
            Array.from({ length: b.rounds }, (_, r) => r + 1).some(
              (r) => !done.has(setKey(i.id, r)) && !added.includes(setKey(i.id, r)),
            ),
          ),
      );
      if (next !== -1) setTimeout(() => goTo(next), 220);
    }
  }

  function swapExercise(item: SessionItem, workout: Workout) {
    const patch = {
      workout_id: workout.id,
      workout_name: workout.name,
      description: workout.description,
      category: workout.category,
      target_reps: workout.target_reps,
      target_duration_seconds: workout.target_duration_seconds,
      image_path: workout.image_path,
      image_paths: workout.image_path ? [workout.image_path] : [],
      muscles: workout.muscles ?? [],
      target_area: workout.target_area,
      swapped_from: item.workout_name,
    };

    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
    // Sets already logged against this slot no longer describe what was done.
    setDone((prev) => {
      const next = new Set(prev);
      for (let r = 1; r <= 50; r++) next.delete(setKey(item.id, r));
      return next;
    });
    setSwapping(false);
    enqueue({ kind: "item_swap", itemId: item.id, patch });
    void flush();
  }

  async function finish() {
    setFinishing(true);
    enqueue({ kind: "session_finish", sessionId, completedAt: new Date().toISOString() });
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

  const nextRound = current
    ? Array.from({ length: current.rounds }, (_, i) => i + 1).find((r) =>
        current.items.some((i) => !done.has(setKey(i.id, r))),
      )
    : undefined;

  return (
    <div className="fixed inset-0 flex flex-col bg-base">
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

          {/* One tick per block, filling as its sets complete. */}
          <div className="mt-2.5 flex gap-1" role="group" aria-label="Blocks">
            {grouped.map((block, i) => {
              const blockTotal = block.items.length * block.rounds;
              const blockDone = block.items.reduce(
                (sum, item) =>
                  sum +
                  Array.from({ length: block.rounds }, (_, r) => r + 1).filter((r) =>
                    done.has(setKey(item.id, r)),
                  ).length,
                0,
              );
              const ratio = blockTotal === 0 ? 0 : blockDone / blockTotal;

              return (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Block ${i + 1}, ${blockDone} of ${blockTotal} sets done`}
                  aria-current={i === index ? "true" : undefined}
                  className="group h-6 flex-1 pt-2"
                >
                  <span
                    className={`relative block h-1.5 overflow-hidden rounded-full ${
                      i === index && ratio < 1 ? "bg-chalk/35" : "bg-line"
                    }`}
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-lime transition-[width] duration-200"
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div
        ref={strip}
        onScroll={onScroll}
        className="snap-x-strip flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden"
      >
        {grouped.map((block, i) => (
          <BlockCard
            key={block.id}
            block={block}
            number={i + 1}
            total={grouped.length}
            done={done}
            onToggleSet={toggleSet}
          />
        ))}
      </div>

      <footer className="shrink-0 border-t border-line-soft bg-base px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="mx-auto w-full max-w-lg">
          {allDone ? (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted">
                All {totalSets} sets done. Nice work.
              </p>
              <Button size="lg" onClick={finish} disabled={finishing}>
                {finishing && <Spinner />}
                Finish session
              </Button>
            </div>
          ) : (
            current && (
              <>
                <Button size="lg" onClick={completeRound} disabled={nextRound === undefined}>
                  <CheckIcon />
                  {current.items.length === 1
                    ? `Done, set ${nextRound} of ${current.rounds}`
                    : `Done, round ${nextRound} of ${current.rounds}`}
                </Button>

                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setSwapping(true)}
                    className="min-h-11 px-1 text-sm font-medium text-muted"
                  >
                    Swap
                  </button>
                  <span className="tnum text-sm text-muted">
                    {doneSets} of {totalSets} sets
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

      <SwapSheet
        open={swapping}
        block={current}
        library={library}
        onClose={() => setSwapping(false)}
        onPick={swapExercise}
      />

      <Sheet open={confirmQuit} onClose={() => setConfirmQuit(false)} title="Leave this session?">
        <p className="text-sm leading-relaxed text-muted">
          Every set you have ticked off stays saved. You can pick this session back up from
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
  block,
  library,
  onClose,
  onPick,
}: {
  open: boolean;
  block: SessionBlockWithItems | undefined;
  library: Workout[];
  onClose: () => void;
  onPick: (item: SessionItem, workout: Workout) => void;
}) {
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<SessionItem | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      // With one exercise there is nothing to choose between.
      setTarget(block && block.items.length === 1 ? block.items[0] : null);
    }
  }, [open, block]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter(
      (w) =>
        w.name.toLowerCase() !== (target?.workout_name ?? "").toLowerCase() &&
        (!q || w.name.toLowerCase().includes(q)),
    );
  }, [library, query, target]);

  if (!block) return null;

  return (
    <Sheet open={open} onClose={onClose} title="Swap an exercise">
      {!target ? (
        <>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            Which one are you replacing?
          </p>
          <ul>
            {block.items.map((item, i) => (
              <li key={item.id} className="border-b border-line-soft last:border-0">
                <button
                  type="button"
                  onClick={() => setTarget(item)}
                  className="flex w-full items-center gap-3 py-3 text-left active:bg-surface"
                >
                  <span className="ex grid h-6 w-6 shrink-0 place-items-center rounded bg-raise text-xs font-bold text-muted">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <Thumb path={item.image_path} alt="" className="h-11 w-11 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {item.workout_name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            Replaces {target.workout_name} for this session only. Your routine stays as it is,
            and any sets already logged against it are cleared.
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
                    onClick={() => onPick(target, workout)}
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
        </>
      )}
    </Sheet>
  );
}
