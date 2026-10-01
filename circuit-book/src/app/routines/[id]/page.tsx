"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import {
  modeForCount,
  type BlockMode,
  type Routine,
  type RoutineBlock,
  type RoutineItem,
  type Workout,
} from "@/lib/database.types";
import { byPosition, estimateMinutes, formatTarget } from "@/lib/format";
import { muscleSentence } from "@/lib/muscles";
import { startSession } from "@/lib/session";
import BodyMap from "@/components/BodyMap";
import DayPicker from "@/components/DayPicker";
import Thumb from "@/components/Thumb";
import WorkoutEditor from "@/components/WorkoutEditor";
import {
  Button,
  Chip,
  Field,
  Input,
  LoadingPanel,
  Notice,
  Sheet,
  Spinner,
  Tag,
} from "@/components/ui";

type Item = RoutineItem & { workout: Workout | null };
type Block = RoutineBlock & { items: Item[] };

const MODE_LABEL: Record<BlockMode, string> = {
  straight: "Straight sets",
  superset: "Superset",
  circuit: "Circuit",
};

export default function RoutineBuilderPage() {
  const params = useParams<{ id: string }>();
  const routineId = params.id;
  const router = useRouter();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [library, setLibrary] = useState<Workout[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [picking, setPicking] = useState<{ blockId: string | null } | null>(null);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [creatingWorkout, setCreatingWorkout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [routineRes, blocksRes, itemsRes, daysRes, libraryRes] = await Promise.all([
      supabase.from("cb_routines").select("*").eq("id", routineId).single(),
      supabase.from("cb_routine_blocks").select("*").eq("routine_id", routineId),
      supabase
        .from("cb_routine_items")
        .select("*, workout:cb_workouts(*)")
        .eq("routine_id", routineId),
      supabase.from("cb_routine_days").select("day_of_week").eq("routine_id", routineId),
      supabase.from("cb_workouts").select("*").order("name"),
    ]);

    if (routineRes.error || !routineRes.data) {
      setError("That routine is not there any more.");
      setLoading(false);
      return;
    }

    const items = (itemsRes.data ?? []) as Item[];
    setRoutine(routineRes.data);
    setName(routineRes.data.name);
    setBlocks(
      byPosition(blocksRes.data ?? []).map((block) => ({
        ...block,
        items: byPosition(items.filter((i) => i.block_id === block.id)),
      })),
    );
    setDays((daysRes.data ?? []).map((d) => d.day_of_week).sort());
    setLibrary(libraryRes.data ?? []);
    setLoading(false);
  }, [routineId]);

  useEffect(() => {
    void load();
  }, [load]);

  const allWorkouts = useMemo(
    () => blocks.flatMap((b) => b.items.map((i) => i.workout)).filter(Boolean) as Workout[],
    [blocks],
  );

  const muscles = useMemo(
    () => Array.from(new Set(allWorkouts.flatMap((w) => w.muscles ?? []))),
    [allWorkouts],
  );

  const minutes = useMemo(
    () =>
      estimateMinutes(
        blocks.flatMap((b) =>
          b.items.map((i) => ({
            sets: b.rounds,
            durationSeconds: i.workout?.target_duration_seconds ?? null,
          })),
        ),
      ),
    [blocks],
  );

  const totalSets = blocks.reduce((sum, b) => sum + b.items.length * b.rounds, 0);

  /* --- Routine-level edits ------------------------------------------- */

  async function saveName() {
    const trimmed = name.trim();
    if (!routine || !trimmed || trimmed === routine.name) return;
    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("cb_routines")
      .update({ name: trimmed })
      .eq("id", routineId);
    if (error) setError("Could not rename the routine.");
    else setRoutine({ ...routine, name: trimmed });
  }

  async function saveDays(next: number[]) {
    if (!userId) return;
    const previous = days;
    setDays(next);

    const supabase = supabaseBrowser();
    const added = next.filter((d) => !previous.includes(d));
    const removed = previous.filter((d) => !next.includes(d));

    try {
      if (removed.length > 0) {
        const { error } = await supabase
          .from("cb_routine_days")
          .delete()
          .eq("routine_id", routineId)
          .in("day_of_week", removed);
        if (error) throw error;
      }
      if (added.length > 0) {
        const { error } = await supabase
          .from("cb_routine_days")
          .insert(
            added.map((day) => ({ routine_id: routineId, day_of_week: day, user_id: userId })),
          );
        if (error) throw error;
      }
    } catch {
      setDays(previous);
      setError("Could not change the days. Check your connection.");
    }
  }

  /* --- Block edits ---------------------------------------------------- */

  /** Add workouts, either into an existing block or as a brand new one. */
  async function addWorkouts(workoutIds: string[], intoBlockId: string | null) {
    if (!userId || workoutIds.length === 0) return;
    const supabase = supabaseBrowser();

    try {
      let blockId = intoBlockId;
      let created: RoutineBlock | null = null;

      if (!blockId) {
        const defaultRounds =
          library.find((w) => w.id === workoutIds[0])?.target_sets ?? 3;
        const { data, error } = await supabase
          .from("cb_routine_blocks")
          .insert({
            routine_id: routineId,
            user_id: userId,
            position: blocks.length,
            mode: modeForCount(workoutIds.length),
            rounds: Math.min(50, Math.max(1, defaultRounds)),
          })
          .select()
          .single();
        if (error) throw error;
        created = data;
        blockId = data.id;
      }

      const existingCount = intoBlockId
        ? (blocks.find((b) => b.id === intoBlockId)?.items.length ?? 0)
        : 0;

      const { data: rows, error: itemsError } = await supabase
        .from("cb_routine_items")
        .insert(
          workoutIds.map((workoutId, i) => ({
            routine_id: routineId,
            block_id: blockId!,
            workout_id: workoutId,
            position: existingCount + i,
            user_id: userId,
          })),
        )
        .select("*, workout:cb_workouts(*)");
      if (itemsError) throw itemsError;

      const newItems = (rows ?? []) as Item[];

      if (created) {
        setBlocks((list) => [...list, { ...created!, items: newItems }]);
      } else {
        // Adding a second exercise turns a straight set into a superset.
        setBlocks((list) =>
          list.map((b) => {
            if (b.id !== blockId) return b;
            const items = [...b.items, ...newItems];
            return { ...b, items, mode: modeForCount(items.length) };
          }),
        );
        const block = blocks.find((b) => b.id === blockId);
        if (block) {
          const nextMode = modeForCount(block.items.length + newItems.length);
          if (nextMode !== block.mode) {
            await supabase.from("cb_routine_blocks").update({ mode: nextMode }).eq("id", blockId);
          }
        }
      }
    } catch {
      setError("Could not add those exercises.");
    }
  }

  async function updateBlock(blockId: string, patch: Partial<RoutineBlock>) {
    setBlocks((list) => list.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("cb_routine_blocks").update(patch).eq("id", blockId);
    if (error) setError("Could not save that change.");
  }

  async function removeBlock(blockId: string) {
    const previous = blocks;
    const next = blocks.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, position: i }));
    setBlocks(next);
    setEditingBlock(null);

    const supabase = supabaseBrowser();
    const { error } = await supabase.from("cb_routine_blocks").delete().eq("id", blockId);
    if (error) {
      setBlocks(previous);
      setError("Could not remove that block.");
      return;
    }
    await Promise.all(
      next.map((b, i) => supabase.from("cb_routine_blocks").update({ position: i }).eq("id", b.id)),
    );
  }

  async function removeItem(blockId: string, itemId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    // Taking the last exercise out leaves an empty block, so drop the block too.
    if (block.items.length === 1) {
      await removeBlock(blockId);
      return;
    }

    const remaining = block.items.filter((i) => i.id !== itemId);
    setBlocks((list) =>
      list.map((b) =>
        b.id === blockId
          ? { ...b, items: remaining, mode: modeForCount(remaining.length) }
          : b,
      ),
    );
    setEditingBlock((b) =>
      b && b.id === blockId
        ? { ...b, items: remaining, mode: modeForCount(remaining.length) }
        : b,
    );

    const supabase = supabaseBrowser();
    await supabase.from("cb_routine_items").delete().eq("id", itemId);
    await supabase
      .from("cb_routine_blocks")
      .update({ mode: modeForCount(remaining.length) })
      .eq("id", blockId);
    await Promise.all(
      remaining.map((item, i) =>
        supabase.from("cb_routine_items").update({ position: i }).eq("id", item.id),
      ),
    );
  }

  async function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;

    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((b, i) => ({ ...b, position: i }));
    setBlocks(renumbered);

    const supabase = supabaseBrowser();
    await Promise.all(
      renumbered.map((b, i) =>
        supabase.from("cb_routine_blocks").update({ position: i }).eq("id", b.id),
      ),
    );
  }

  async function removeRoutine() {
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("cb_routines").delete().eq("id", routineId);
    if (error) setError("Could not delete that routine.");
    else router.replace("/routines");
  }

  async function begin() {
    if (!routine || !userId || blocks.length === 0) return;
    setStarting(true);
    try {
      const id = await startSession(routine.id, routine.name, userId);
      router.push(`/session/${id}`);
    } catch (err) {
      setError(
        err instanceof Error && err.message === "empty-routine"
          ? "Add at least one exercise before starting."
          : "Could not start the session. Check your connection and try again.",
      );
      setStarting(false);
    }
  }

  /* --- Render ---------------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-dvh">
        <LoadingPanel label="Loading routine" />
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="min-h-dvh px-4 py-8">
        <Notice>{error ?? "That routine is not there any more."}</Notice>
        <div className="mt-4">
          <Link href="/routines" className="text-sm text-lime underline underline-offset-4">
            Back to routines
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col pb-40">
      <header className="pad-safe-t sticky top-0 z-30 border-b border-line-soft bg-base/92 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-lg items-center gap-2 px-2 py-2">
          <Link
            href="/routines"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-raise"
            aria-label="Back to routines"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M12.5 4.5l-6 5.5 6 5.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <span className="truncate text-sm text-muted">Routine</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg px-4">
        <div className="pt-5">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              className="ex text-lg font-semibold"
            />
          </Field>
        </div>

        <div className="pt-5">
          <span className="mb-2 block text-sm font-medium text-muted">Days</span>
          <DayPicker selected={days} onChange={saveDays} />
        </div>

        {error && (
          <div className="pt-5">
            <Notice>{error}</Notice>
          </div>
        )}

        <div className="flex items-baseline justify-between pt-8 pb-2">
          <h2 className="ex text-lg font-bold">Blocks</h2>
          {blocks.length > 0 && (
            <span className="tnum text-sm text-muted">
              {totalSets} sets, about {minutes} min
            </span>
          )}
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="mx-auto w-full max-w-lg px-4">
          <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
            <p className="text-sm leading-relaxed text-muted">
              A block is one exercise done for a few rounds, or two or three alternated as a
              superset. Add the first one and put the exercises in the order you run them.
            </p>
            <div className="mt-5 flex justify-center">
              <Button onClick={() => setPicking({ blockId: null })}>Add a block</Button>
            </div>
          </div>
        </div>
      ) : (
        <ol className="mx-auto w-full max-w-lg">
          {blocks.map((block, index) => (
            <li key={block.id} className="border-b border-line-soft">
              <div className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <span className="tnum ex w-6 shrink-0 pt-0.5 text-center text-sm font-bold text-faint">
                    {index + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => setEditingBlock(block)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <span className="ex text-sm font-semibold">
                        {MODE_LABEL[block.mode]}
                      </span>
                      <span className="tnum text-sm text-muted">
                        {block.rounds} {block.rounds === 1 ? "round" : "rounds"}
                      </span>
                    </span>

                    <span className="mt-2 block space-y-1.5">
                      {block.items.map((item, row) => {
                        const target = formatTarget({
                          sets: null,
                          reps: item.reps_override ?? item.workout?.target_reps,
                          durationSeconds: item.workout?.target_duration_seconds,
                        });
                        return (
                          <span key={item.id} className="flex items-center gap-2.5">
                            {block.items.length > 1 && (
                              <span
                                className="ex grid h-5 w-5 shrink-0 place-items-center rounded bg-raise text-[0.65rem] font-bold text-muted"
                                aria-hidden="true"
                              >
                                {String.fromCharCode(65 + row)}
                              </span>
                            )}
                            <Thumb
                              path={item.workout?.image_path ?? null}
                              alt=""
                              className="h-9 w-9 shrink-0"
                            />
                            <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium">
                              {item.workout?.name ?? "Workout"}
                            </span>
                            {target && (
                              <span className="tnum shrink-0 text-sm text-muted">{target}</span>
                            )}
                          </span>
                        );
                      })}
                    </span>
                  </button>

                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move block ${index + 1} earlier`}
                      className="flex h-8 w-9 items-center justify-center rounded text-muted disabled:opacity-25 active:bg-raise"
                    >
                      <ArrowIcon dir="up" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                      aria-label={`Move block ${index + 1} later`}
                      className="flex h-8 w-9 items-center justify-center rounded text-muted disabled:opacity-25 active:bg-raise"
                    >
                      <ArrowIcon dir="down" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {blocks.length > 0 && (
        <div className="mx-auto mt-5 w-full max-w-lg px-4">
          <Button variant="outline" onClick={() => setPicking({ blockId: null })} className="w-full">
            Add another block
          </Button>
        </div>
      )}

      {/* Coverage ------------------------------------------------------ */}
      {muscles.length > 0 && (
        <div className="mx-auto mt-10 w-full max-w-lg px-4">
          <h2 className="ex mb-3 text-lg font-bold">What this covers</h2>
          <div className="flex items-start gap-4 rounded-xl border border-line bg-surface p-4">
            <div className="w-28 shrink-0">
              <BodyMap muscles={muscles} showLabels={false} />
            </div>
            <p className="min-w-0 flex-1 pt-1 text-sm leading-relaxed text-muted">
              {muscleSentence(muscles)}.
            </p>
          </div>
        </div>
      )}

      <div className="mx-auto mt-10 w-full max-w-lg px-4">
        {confirmDelete ? (
          <div className="rounded-xl border border-line p-4">
            <p className="text-sm text-muted">
              Delete this routine? Your workouts stay in the library, and finished sessions keep
              their record.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)} className="flex-1">
                Keep it
              </Button>
              <Button variant="danger" onClick={removeRoutine} className="flex-1">
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-muted underline underline-offset-4"
          >
            Delete this routine
          </button>
        )}
      </div>

      {blocks.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur-sm">
          <div className="mx-auto w-full max-w-lg">
            <Button size="lg" onClick={begin} disabled={starting}>
              {starting && <Spinner />}
              Start this routine
            </Button>
          </div>
        </div>
      )}

      <WorkoutPicker
        open={picking !== null}
        intoBlock={picking?.blockId ? blocks.find((b) => b.id === picking.blockId) : undefined}
        library={library}
        onClose={() => setPicking(null)}
        onAdd={(ids) => {
          const into = picking?.blockId ?? null;
          setPicking(null);
          void addWorkouts(ids, into);
        }}
        onCreateNew={() => {
          setPicking(null);
          setCreatingWorkout(true);
        }}
      />

      <BlockSettings
        block={editingBlock}
        onClose={() => setEditingBlock(null)}
        onRounds={(rounds) => editingBlock && updateBlock(editingBlock.id, { rounds })}
        onAddExercise={() => {
          const id = editingBlock?.id ?? null;
          setEditingBlock(null);
          setPicking({ blockId: id });
        }}
        onRemoveItem={(itemId) => editingBlock && removeItem(editingBlock.id, itemId)}
        onRemoveBlock={() => editingBlock && removeBlock(editingBlock.id)}
      />

      {userId && (
        <WorkoutEditor
          open={creatingWorkout}
          workout={null}
          userId={userId}
          onClose={() => setCreatingWorkout(false)}
          onSaved={(workout) => {
            setLibrary((list) => [...list, workout].sort((a, b) => a.name.localeCompare(b.name)));
            void addWorkouts([workout.id], null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Block settings                                                     */
/* ------------------------------------------------------------------ */

function BlockSettings({
  block,
  onClose,
  onRounds,
  onAddExercise,
  onRemoveItem,
  onRemoveBlock,
}: {
  block: Block | null;
  onClose: () => void;
  onRounds: (rounds: number) => void;
  onAddExercise: () => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveBlock: () => void;
}) {
  if (!block) return null;

  const mode = modeForCount(block.items.length);

  return (
    <Sheet open={!!block} onClose={onClose} title={MODE_LABEL[mode]}>
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-muted">
          {mode === "straight"
            ? "One exercise, all its sets in a row with rest between each."
            : mode === "superset"
              ? "Two exercises alternated: the first, then the second, then back again each round."
              : "Three or more exercises cycled through, one round at a time."}
        </p>

        {/* Rounds -------------------------------------------------- */}
        <div>
          <span className="mb-2 block text-sm font-medium text-muted">
            {mode === "straight" ? "Sets" : "Rounds"}
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onRounds(Math.max(1, block.rounds - 1))}
              disabled={block.rounds <= 1}
              aria-label="One fewer"
              className="grid h-12 w-12 place-items-center rounded-xl border border-line text-chalk disabled:opacity-30 active:bg-raise"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 10h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
            <span className="ex-tight tnum min-w-14 text-center text-3xl font-bold">
              {block.rounds}
            </span>
            <button
              type="button"
              onClick={() => onRounds(Math.min(50, block.rounds + 1))}
              disabled={block.rounds >= 50}
              aria-label="One more"
              className="grid h-12 w-12 place-items-center rounded-xl border border-line text-chalk disabled:opacity-30 active:bg-raise"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 4v12M4 10h12"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="flex-1 text-xs leading-snug text-faint">
              {block.items.length * block.rounds} sets in this block
            </span>
          </div>
        </div>

        {/* Exercises ------------------------------------------------ */}
        <div>
          <span className="mb-2 block text-sm font-medium text-muted">Exercises</span>
          <ul>
            {block.items.map((item, i) => (
              <li key={item.id} className="border-b border-line-soft last:border-0">
                <div className="flex items-center gap-3 py-2.5">
                  {block.items.length > 1 && (
                    <span className="ex grid h-6 w-6 shrink-0 place-items-center rounded bg-raise text-xs font-bold text-muted">
                      {String.fromCharCode(65 + i)}
                    </span>
                  )}
                  <Thumb
                    path={item.workout?.image_path ?? null}
                    alt=""
                    className="h-11 w-11 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {item.workout?.name ?? "Workout"}
                    </span>
                    {item.workout?.muscles && item.workout.muscles.length > 0 && (
                      <span className="block truncate text-xs text-faint">
                        {muscleSentence(item.workout.muscles)}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    aria-label={`Remove ${item.workout?.name ?? "exercise"}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded text-muted active:bg-raise"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M4 6h12M8.5 6V4.5h3V6M6 6l.7 9.5h6.6L14 6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <Button variant="outline" onClick={onAddExercise} className="mt-3 w-full">
            {block.items.length === 1 ? "Pair with another exercise" : "Add another exercise"}
          </Button>
          {block.items.length === 1 && (
            <p className="mt-2 text-xs leading-snug text-faint">
              Adding a second exercise turns this into a superset, alternated each round.
            </p>
          )}
        </div>

        <div className="border-t border-line-soft pt-4">
          <button
            type="button"
            onClick={onRemoveBlock}
            className="text-sm text-muted underline underline-offset-4"
          >
            Remove this block
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Picker                                                             */
/* ------------------------------------------------------------------ */

function WorkoutPicker({
  open,
  intoBlock,
  library,
  onClose,
  onAdd,
  onCreateNew,
}: {
  open: boolean;
  intoBlock?: Block;
  library: Workout[];
  onClose: () => void;
  onAdd: (ids: string[]) => void;
  onCreateNew: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    if (open) {
      setPicked([]);
      setQuery("");
      setCategory("All");
    }
  }, [open]);

  const categories = useMemo(() => {
    const found = new Set<string>();
    library.forEach((w) => w.category && found.add(w.category));
    return ["All", ...Array.from(found).sort()];
  }, [library]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return library.filter((w) => {
      if (category !== "All" && w.category !== category) return false;
      return !q || w.name.toLowerCase().includes(q);
    });
  }, [library, query, category]);

  const already = new Set(intoBlock?.items.map((i) => i.workout_id) ?? []);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={intoBlock ? "Add to this block" : "New block"}
      footer={
        <Button size="lg" onClick={() => onAdd(picked)} disabled={picked.length === 0}>
          {picked.length === 0
            ? "Pick some exercises"
            : intoBlock
              ? `Add ${picked.length}`
              : picked.length === 1
                ? "Add as straight sets"
                : picked.length === 2
                  ? "Add as a superset"
                  : `Add as a circuit of ${picked.length}`}
        </Button>
      }
    >
      {library.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm leading-relaxed text-muted">
            Your library is empty. Add a workout first and it will show up here.
          </p>
          <div className="mt-5 flex justify-center">
            <Button onClick={onCreateNew}>Create a workout</Button>
          </div>
        </div>
      ) : (
        <>
          {!intoBlock && (
            <p className="mb-3 text-sm leading-relaxed text-muted">
              Pick one for straight sets, or two or three to alternate between as a superset.
            </p>
          )}

          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workouts"
            aria-label="Search workouts"
          />

          {categories.length > 1 && (
            <div className="rail -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
              {categories.map((c) => (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          )}

          <ul className="mt-3">
            {visible.map((workout) => {
              const on = picked.includes(workout.id);
              return (
                <li key={workout.id} className="border-b border-line-soft last:border-0">
                  <button
                    type="button"
                    onClick={() =>
                      setPicked((list) =>
                        list.includes(workout.id)
                          ? list.filter((x) => x !== workout.id)
                          : [...list, workout.id],
                      )
                    }
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
                        on ? "border-lime bg-lime text-base" : "border-line"
                      }`}
                      aria-hidden="true"
                    >
                      {on && (
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M4.5 10.5l3.5 3.5 7.5-8"
                            stroke="currentColor"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <Thumb path={workout.image_path} alt="" className="h-11 w-11 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{workout.name}</span>
                      <span className="flex items-center gap-2">
                        {workout.muscles?.length > 0 && (
                          <span className="truncate text-xs text-faint">
                            {muscleSentence(workout.muscles)}
                          </span>
                        )}
                      </span>
                    </span>
                    {already.has(workout.id) && <Tag>in block</Tag>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 border-t border-line-soft pt-4">
            <Button variant="outline" onClick={onCreateNew} className="w-full">
              Create a new workout
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}

function ArrowIcon({ dir }: { dir: "up" | "down" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ transform: dir === "down" ? "rotate(180deg)" : undefined }}
    >
      <path
        d="M10 15V5M5.5 9.5L10 5l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
