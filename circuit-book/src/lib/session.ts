"use client";

import { supabaseBrowser } from "@/lib/supabase/client";
import type { RoutineBlock, RoutineItem, Workout } from "@/lib/database.types";

type ItemWithWorkout = RoutineItem & { workout: Workout | null };

/**
 * Start a session from a routine.
 *
 * Everything is copied onto the session rather than referenced: block modes,
 * round counts, exercise names, targets, photos and muscles. Editing or
 * deleting a library entry afterwards must never rewrite what was actually
 * done that day.
 */
export async function startSession(
  routineId: string,
  routineName: string,
  userId: string,
): Promise<string> {
  const supabase = supabaseBrowser();

  const [blocksRes, itemsRes] = await Promise.all([
    supabase.from("cb_routine_blocks").select("*").eq("routine_id", routineId).order("position"),
    supabase
      .from("cb_routine_items")
      .select("*, workout:cb_workouts(*)")
      .eq("routine_id", routineId)
      .order("position"),
  ]);

  if (blocksRes.error) throw blocksRes.error;
  if (itemsRes.error) throw itemsRes.error;

  const blocks = (blocksRes.data ?? []) as RoutineBlock[];
  const items = (itemsRes.data ?? []) as ItemWithWorkout[];

  if (blocks.length === 0 || items.length === 0) {
    throw new Error("empty-routine");
  }

  const { data: session, error } = await supabase
    .from("cb_sessions")
    .insert({ routine_id: routineId, routine_name: routineName, user_id: userId })
    .select()
    .single();
  if (error) throw error;

  // Photo sequences live in their own table, so they are fetched in one go and
  // folded into each snapshot rather than queried per exercise.
  const workoutIds = Array.from(
    new Set(items.map((i) => i.workout_id).filter(Boolean)),
  ) as string[];

  const { data: imageRows } = await supabase
    .from("cb_workout_images")
    .select("workout_id, path, position")
    .in("workout_id", workoutIds)
    .order("position");

  const sequences = new Map<string, string[]>();
  (imageRows ?? []).forEach((row) => {
    const list = sequences.get(row.workout_id) ?? [];
    list.push(row.path);
    sequences.set(row.workout_id, list);
  });

  const blockRows = blocks.map((block, position) => ({
    id: crypto.randomUUID(),
    session_id: session.id,
    user_id: userId,
    position,
    mode: block.mode,
    rounds: block.rounds,
    rest_seconds: block.rest_seconds,
    label: block.label,
    routineBlockId: block.id,
  }));

  const { error: blocksError } = await supabase
    .from("cb_session_blocks")
    .insert(blockRows.map(({ routineBlockId: _ignored, ...row }) => row));
  if (blocksError) throw blocksError;

  const blockIdFor = new Map(blockRows.map((b) => [b.routineBlockId, b.id]));

  const itemRows = items
    .filter((item) => blockIdFor.has(item.block_id))
    .map((item) => {
      const w = item.workout;
      const paths = w?.id ? (sequences.get(w.id) ?? []) : [];
      return {
        session_id: session.id,
        user_id: userId,
        block_id: blockIdFor.get(item.block_id)!,
        workout_id: item.workout_id,
        workout_name: w?.name ?? "Workout",
        description: item.notes ?? w?.description ?? null,
        category: w?.category ?? null,
        target_sets: item.sets_override ?? w?.target_sets ?? null,
        target_reps: item.reps_override ?? w?.target_reps ?? null,
        target_duration_seconds: w?.target_duration_seconds ?? null,
        image_path: w?.image_path ?? null,
        image_paths: paths.length > 0 ? paths : w?.image_path ? [w.image_path] : [],
        muscles: w?.muscles ?? [],
        target_area: w?.target_area ?? null,
        position: item.position,
      };
    });

  const { error: itemsError } = await supabase.from("cb_session_items").insert(itemRows);
  if (itemsError) throw itemsError;

  return session.id;
}
