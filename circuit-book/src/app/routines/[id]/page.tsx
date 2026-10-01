"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Routine, RoutineItem, Workout } from "@/lib/database.types";
import { byPosition, estimateMinutes, formatTarget } from "@/lib/format";
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

type Station = RoutineItem & { workout: Workout | null };

export default function RoutineBuilderPage() {
  const params = useParams<{ id: string }>();
  const routineId = params.id;
  const router = useRouter();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [library, setLibrary] = useState<Workout[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [picking, setPicking] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
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

    const [routineRes, itemsRes, daysRes, libraryRes] = await Promise.all([
      supabase.from("cb_routines").select("*").eq("id", routineId).single(),
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

    setRoutine(routineRes.data);
    setName(routineRes.data.name);
    setStations(byPosition((itemsRes.data ?? []) as Station[]));
    setDays((daysRes.data ?? []).map((d) => d.day_of_week).sort());
    setLibrary(libraryRes.data ?? []);
    setLoading(false);
  }, [routineId]);

  useEffect(() => {
    void load();
  }, [load]);

  const minutes = useMemo(
    () =>
      estimateMinutes(
        stations.map((s) => ({
          sets: s.sets_override ?? s.workout?.target_sets ?? null,
          durationSeconds: s.workout?.target_duration_seconds ?? null,
        })),
      ),
    [stations],
  );

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
        const { error } = await supabase.from("cb_routine_days").insert(
          added.map((day) => ({ routine_id: routineId, day_of_week: day, user_id: userId })),
        );
        if (error) throw error;
      }
    } catch {
      setDays(previous);
      setError("Could not change the days. Check your connection.");
    }
  }

  async function removeRoutine() {
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("cb_routines").delete().eq("id", routineId);
    if (error) setError("Could not delete that routine.");
    else router.replace("/routines");
  }

  /* --- Station edits -------------------------------------------------- */

  async function addWorkouts(workoutIds: string[]) {
    if (!userId || workoutIds.length === 0) return;
    const supabase = supabaseBrowser();
    const start = stations.length;

    const rows = workoutIds.map((workoutId, i) => ({
      routine_id: routineId,
      workout_id: workoutId,
      position: start + i,
      user_id: userId,
    }));

    const { data, error } = await supabase
      .from("cb_routine_items")
      .insert(rows)
      .select("*, workout:cb_workouts(*)");

    if (error) {
      setError("Could not add those stations.");
      return;
    }
    setStations((list) => byPosition([...list, ...((data ?? []) as Station[])]));
  }

  async function removeStation(id: string) {
    const previous = stations;
    const next = stations.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i }));
    setStations(next);

    const supabase = supabaseBrowser();
    const { error } = await supabase.from("cb_routine_items").delete().eq("id", id);
    if (error) {
      setStations(previous);
      setError("Could not remove that station.");
      return;
    }
    void persistOrder(next);
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= stations.length) return;

    const next = [...stations];
    [next[index], next[target]] = [next[target], next[index]];
    const renumbered = next.map((s, i) => ({ ...s, position: i }));
    setStations(renumbered);
    void persistOrder(renumbered);
  }

  async function persistOrder(list: Station[]) {
    const supabase = supabaseBrowser();
    await Promise.all(
      list.map((station, i) =>
        supabase.from("cb_routine_items").update({ position: i }).eq("id", station.id),
      ),
    );
  }

  async function saveOverrides(station: Station, sets: string, reps: string, notes: string) {
    const patch = {
      sets_override: sets.trim() ? Number(sets) : null,
      reps_override: reps.trim() || null,
      notes: notes.trim() || null,
    };

    setStations((list) => list.map((s) => (s.id === station.id ? { ...s, ...patch } : s)));
    setEditingStation(null);

    const supabase = supabaseBrowser();
    const { error } = await supabase
      .from("cb_routine_items")
      .update(patch)
      .eq("id", station.id);
    if (error) setError("Could not save that change.");
  }

  /* --- Starting a session --------------------------------------------- */

  async function startSession() {
    if (!routine || !userId || stations.length === 0) return;
    setStarting(true);

    const supabase = supabaseBrowser();
    try {
      const { data: session, error } = await supabase
        .from("cb_sessions")
        .insert({ routine_id: routine.id, routine_name: routine.name, user_id: userId })
        .select()
        .single();
      if (error) throw error;

      // Station details are copied onto the session so later edits to the
      // library never rewrite what was actually done that day.
      const items = stations.map((station, i) => ({
        session_id: session.id,
        user_id: userId,
        workout_id: station.workout_id,
        workout_name: station.workout?.name ?? "Workout",
        description: station.notes ?? station.workout?.description ?? null,
        category: station.workout?.category ?? null,
        target_sets: station.sets_override ?? station.workout?.target_sets ?? null,
        target_reps: station.reps_override ?? station.workout?.target_reps ?? null,
        target_duration_seconds: station.workout?.target_duration_seconds ?? null,
        image_path: station.workout?.image_path ?? null,
        position: i,
      }));

      const { error: itemsError } = await supabase.from("cb_session_items").insert(items);
      if (itemsError) throw itemsError;

      router.push(`/session/${session.id}`);
    } catch {
      setError("Could not start the session. Check your connection and try again.");
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

  const alreadyAdded = new Set(stations.map((s) => s.workout_id));

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
          <h2 className="ex text-lg font-bold">Stations</h2>
          {stations.length > 0 && (
            <span className="tnum text-sm text-muted">
              {stations.length} {stations.length === 1 ? "station" : "stations"}, about {minutes} min
            </span>
          )}
        </div>
      </div>

      {stations.length === 0 ? (
        <div className="mx-auto w-full max-w-lg px-4">
          <div className="rounded-xl border border-dashed border-line px-5 py-10 text-center">
            <p className="text-sm leading-relaxed text-muted">
              No stations yet. Pull workouts in from your library and put them in the order you
              want to run them.
            </p>
            <div className="mt-5 flex justify-center">
              <Button onClick={() => setPicking(true)}>Add stations</Button>
            </div>
          </div>
        </div>
      ) : (
        <ol className="mx-auto w-full max-w-lg">
          {stations.map((station, index) => {
            const target = formatTarget({
              sets: station.sets_override ?? station.workout?.target_sets,
              reps: station.reps_override ?? station.workout?.target_reps,
              durationSeconds: station.workout?.target_duration_seconds,
            });
            const overridden =
              station.sets_override !== null || station.reps_override !== null;

            return (
              <li key={station.id} className="border-b border-line-soft">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="tnum ex w-6 shrink-0 text-center text-sm font-bold text-faint">
                    {index + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() => setEditingStation(station)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Thumb
                      path={station.workout?.image_path ?? null}
                      alt=""
                      className="h-12 w-12 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="ex block truncate font-semibold">
                        {station.workout?.name ?? "Workout"}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        {target && <span className="tnum text-sm text-muted">{target}</span>}
                        {overridden && <Tag>adjusted</Tag>}
                      </span>
                    </span>
                  </button>

                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${station.workout?.name ?? "station"} earlier`}
                      className="flex h-8 w-9 items-center justify-center rounded text-muted disabled:opacity-25 active:bg-raise"
                    >
                      <ArrowIcon dir="up" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === stations.length - 1}
                      aria-label={`Move ${station.workout?.name ?? "station"} later`}
                      className="flex h-8 w-9 items-center justify-center rounded text-muted disabled:opacity-25 active:bg-raise"
                    >
                      <ArrowIcon dir="down" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {stations.length > 0 && (
        <div className="mx-auto mt-5 w-full max-w-lg px-4">
          <Button variant="outline" onClick={() => setPicking(true)} className="w-full">
            Add more stations
          </Button>
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

      {/* Start bar ----------------------------------------------------- */}
      {stations.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] backdrop-blur-sm">
          <div className="mx-auto w-full max-w-lg">
            <Button size="lg" onClick={startSession} disabled={starting}>
              {starting && <Spinner />}
              Start this routine
            </Button>
          </div>
        </div>
      )}

      <WorkoutPicker
        open={picking}
        library={library}
        alreadyAdded={alreadyAdded}
        onClose={() => setPicking(false)}
        onAdd={(ids) => {
          setPicking(false);
          void addWorkouts(ids);
        }}
        onCreateNew={() => {
          setPicking(false);
          setCreatingWorkout(true);
        }}
      />

      <StationSettings
        station={editingStation}
        onClose={() => setEditingStation(null)}
        onSave={saveOverrides}
        onRemove={(id) => {
          setEditingStation(null);
          void removeStation(id);
        }}
      />

      {userId && (
        <WorkoutEditor
          open={creatingWorkout}
          workout={null}
          userId={userId}
          onClose={() => setCreatingWorkout(false)}
          onSaved={(workout) => {
            setLibrary((list) => [...list, workout].sort((a, b) => a.name.localeCompare(b.name)));
            void addWorkouts([workout.id]);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Picker                                                             */
/* ------------------------------------------------------------------ */

function WorkoutPicker({
  open,
  library,
  alreadyAdded,
  onClose,
  onAdd,
  onCreateNew,
}: {
  open: boolean;
  library: Workout[];
  alreadyAdded: Set<string>;
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

  function toggle(id: string) {
    setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add stations"
      footer={
        <Button size="lg" onClick={() => onAdd(picked)} disabled={picked.length === 0}>
          {picked.length === 0
            ? "Pick some workouts"
            : `Add ${picked.length} ${picked.length === 1 ? "station" : "stations"}`}
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
              const used = alreadyAdded.has(workout.id);
              return (
                <li key={workout.id} className="border-b border-line-soft last:border-0">
                  <button
                    type="button"
                    onClick={() => toggle(workout.id)}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
                        on ? "border-lime bg-lime text-base" : "border-line"
                      }`}
                      aria-hidden="true"
                    >
                      {on && <CheckIcon size={14} />}
                    </span>
                    <Thumb path={workout.image_path} alt="" className="h-11 w-11 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{workout.name}</span>
                      {used && <span className="text-xs text-faint">Already in this routine</span>}
                    </span>
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

/* ------------------------------------------------------------------ */
/* Per-station overrides                                              */
/* ------------------------------------------------------------------ */

function StationSettings({
  station,
  onClose,
  onSave,
  onRemove,
}: {
  station: Station | null;
  onClose: () => void;
  onSave: (station: Station, sets: string, reps: string, notes: string) => void;
  onRemove: (id: string) => void;
}) {
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (station) {
      setSets(station.sets_override ? String(station.sets_override) : "");
      setReps(station.reps_override ?? "");
      setNotes(station.notes ?? "");
    }
  }, [station]);

  if (!station) return null;

  const base = formatTarget({
    sets: station.workout?.target_sets,
    reps: station.workout?.target_reps,
    durationSeconds: station.workout?.target_duration_seconds,
  });

  return (
    <Sheet
      open={!!station}
      onClose={onClose}
      title={station.workout?.name ?? "Station"}
      footer={
        <Button size="lg" onClick={() => onSave(station, sets, reps, notes)}>
          Save station
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-muted">
          {base
            ? `In the library this is ${base}. Change it here and only this routine is affected.`
            : "Set a target for this routine without changing the library entry."}
        </p>

        <div className="flex items-end gap-2">
          <div className="w-20">
            <Input
              type="number"
              min={1}
              max={99}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
              placeholder={station.workout?.target_sets ? String(station.workout.target_sets) : "—"}
              aria-label="Sets for this routine"
              className="tnum text-center"
            />
            <span className="mt-1 block text-center text-xs text-faint">sets</span>
          </div>
          <span className="pb-6 text-lg text-faint" aria-hidden="true">
            ×
          </span>
          <div className="flex-1">
            <Input
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder={station.workout?.target_reps ?? "—"}
              aria-label="Reps for this routine"
              className="text-center"
            />
            <span className="mt-1 block text-center text-xs text-faint">reps</span>
          </div>
        </div>

        <Field label="Note for this routine">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Drop set on the last round"
          />
        </Field>

        <div className="border-t border-line-soft pt-4">
          <button
            type="button"
            onClick={() => onRemove(station.id)}
            className="text-sm text-muted underline underline-offset-4"
          >
            Remove from this routine
          </button>
        </div>
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */

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

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
