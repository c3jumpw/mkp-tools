"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { uploadWorkoutImage, deleteWorkoutImage, forgetSignedUrl } from "@/lib/images";
import {
  MAX_IMAGES_PER_WORKOUT,
  SUGGESTED_CATEGORIES,
  type Workout,
  type WorkoutImage,
} from "@/lib/database.types";
import { muscleSentence } from "@/lib/muscles";
import { Button, Chip, Field, Input, Notice, Sheet, Spinner, Textarea } from "@/components/ui";
import Thumb from "@/components/Thumb";
import MusclePicker from "@/components/MusclePicker";

type Frame = { id?: string; path: string };

type Draft = {
  name: string;
  description: string;
  category: string;
  sets: string;
  reps: string;
  minutes: string;
  seconds: string;
  frames: Frame[];
  muscles: string[];
  targetArea: string;
};

function toDraft(workout: Workout | null, images: WorkoutImage[]): Draft {
  const total = workout?.target_duration_seconds ?? 0;
  return {
    name: workout?.name ?? "",
    description: workout?.description ?? "",
    category: workout?.category ?? "",
    sets: workout?.target_sets ? String(workout.target_sets) : "",
    reps: workout?.target_reps ?? "",
    minutes: total ? String(Math.floor(total / 60)) : "",
    seconds: total ? String(total % 60) : "",
    frames: images.map((i) => ({ id: i.id, path: i.path })),
    muscles: workout?.muscles ?? [],
    targetArea: workout?.target_area ?? "",
  };
}

export default function WorkoutEditor({
  open,
  workout,
  userId,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  workout: Workout | null;
  userId: string;
  onClose: () => void;
  onSaved: (workout: Workout) => void;
  onDeleted?: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(workout, []));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Photos live in their own table, so they are fetched when the sheet opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);

    if (!workout) {
      setDraft(toDraft(null, []));
      return;
    }

    setDraft(toDraft(workout, []));
    setLoadingImages(true);
    const supabase = supabaseBrowser();
    supabase
      .from("cb_workout_images")
      .select("*")
      .eq("workout_id", workout.id)
      .order("position")
      .then(({ data }) => {
        setDraft(toDraft(workout, data ?? []));
        setLoadingImages(false);
      });
  }, [open, workout]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  async function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const room = MAX_IMAGES_PER_WORKOUT - draft.frames.length;
    if (room <= 0) {
      setError(`A workout can hold ${MAX_IMAGES_PER_WORKOUT} photos. Remove one first.`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const chosen = files.slice(0, room);
      const paths = await Promise.all(chosen.map((f) => uploadWorkoutImage(f, userId)));
      setDraft((d) => ({ ...d, frames: [...d.frames, ...paths.map((path) => ({ path }))] }));
      if (files.length > room) {
        setError(`Added ${room}. A workout holds at most ${MAX_IMAGES_PER_WORKOUT} photos.`);
      }
    } catch {
      setError("Those photos would not upload. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function moveFrame(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.frames.length) return;
    const next = [...draft.frames];
    [next[index], next[target]] = [next[target], next[index]];
    set("frames", next);
  }

  function removeFrame(index: number) {
    const frame = draft.frames[index];
    // The storage object is only dropped once the save goes through, so a
    // cancelled edit does not destroy a photo that is still referenced.
    set(
      "frames",
      draft.frames.filter((_, i) => i !== index),
    );
    if (!frame.id) {
      void deleteWorkoutImage(frame.path);
      forgetSignedUrl(frame.path);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError("Give the workout a name so you can find it later.");
      return;
    }

    setBusy(true);
    setError(null);

    const minutes = Number(draft.minutes) || 0;
    const seconds = Number(draft.seconds) || 0;
    const duration = minutes * 60 + seconds;

    const payload = {
      name,
      description: draft.description.trim() || null,
      category: draft.category.trim() || null,
      target_sets: draft.sets ? Number(draft.sets) : null,
      target_reps: draft.reps.trim() || null,
      target_duration_seconds: duration > 0 ? duration : null,
      // The first frame doubles as the cover, so lists need no join.
      image_path: draft.frames[0]?.path ?? null,
      muscles: draft.muscles,
      target_area: draft.targetArea.trim() || null,
    };

    try {
      const supabase = supabaseBrowser();
      let saved: Workout;

      if (workout) {
        const { data, error } = await supabase
          .from("cb_workouts")
          .update(payload)
          .eq("id", workout.id)
          .select()
          .single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await supabase
          .from("cb_workouts")
          .insert({ ...payload, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        saved = data;
      }

      await syncImages(saved.id);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Rewrite the sequence to match the draft, dropping storage objects that go. */
  async function syncImages(workoutId: string) {
    const supabase = supabaseBrowser();

    const { data: existing } = await supabase
      .from("cb_workout_images")
      .select("id, path")
      .eq("workout_id", workoutId);

    const keptPaths = new Set(draft.frames.map((f) => f.path));
    const dropped = (existing ?? []).filter((row) => !keptPaths.has(row.path));

    if (dropped.length > 0) {
      await supabase
        .from("cb_workout_images")
        .delete()
        .in(
          "id",
          dropped.map((d) => d.id),
        );
      dropped.forEach((d) => {
        void deleteWorkoutImage(d.path);
        forgetSignedUrl(d.path);
      });
    }

    const byPath = new Map((existing ?? []).map((row) => [row.path, row.id]));

    // Positions change whenever frames are reordered, so every kept row is
    // rewritten rather than diffed.
    await Promise.all(
      draft.frames.map((frame, position) => {
        const id = byPath.get(frame.path);
        if (id) {
          return supabase.from("cb_workout_images").update({ position }).eq("id", id);
        }
        return supabase
          .from("cb_workout_images")
          .insert({ workout_id: workoutId, path: frame.path, position, user_id: userId });
      }),
    );
  }

  async function remove() {
    if (!workout) return;
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("cb_workouts").delete().eq("id", workout.id);
      if (error) throw error;
      draft.frames.forEach((f) => void deleteWorkoutImage(f.path));
      onDeleted?.(workout.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that. Try again.");
      setBusy(false);
    }
  }

  const atLimit = draft.frames.length >= MAX_IMAGES_PER_WORKOUT;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={workout ? "Edit workout" : "New workout"}
      footer={
        <Button type="submit" form="workout-form" size="lg" disabled={busy || uploading}>
          {busy && <Spinner />}
          {workout ? "Save changes" : "Add to library"}
        </Button>
      }
    >
      <form id="workout-form" onSubmit={save} className="space-y-6">
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Back squat"
            autoFocus={!workout}
            required
          />
        </Field>

        {/* Photo sequence ---------------------------------------------- */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-medium text-muted">Photos</span>
            <span className="text-xs text-faint">
              {draft.frames.length > 1 ? "Shown in order, tap to advance" : "Add a few to show the movement"}
            </span>
          </div>

          {loadingImages ? (
            <div className="flex h-20 items-center gap-2 text-sm text-muted">
              <Spinner />
              Loading photos
            </div>
          ) : (
            <>
              {draft.frames.length > 0 && (
                <ul className="mb-2.5 space-y-2">
                  {draft.frames.map((frame, index) => (
                    <li key={frame.path} className="flex items-center gap-3">
                      <span className="tnum ex w-5 shrink-0 text-center text-sm font-bold text-faint">
                        {index + 1}
                      </span>
                      <Thumb
                        path={frame.path}
                        alt={`Frame ${index + 1}`}
                        className="h-16 w-16 shrink-0"
                        rounded="rounded-lg"
                      />
                      <span className="flex-1 text-xs text-faint">
                        {index === 0 ? "Cover" : null}
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveFrame(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move frame ${index + 1} earlier`}
                          className="flex h-10 w-9 items-center justify-center rounded text-muted disabled:opacity-25 active:bg-raise"
                        >
                          <ArrowIcon dir="up" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFrame(index, 1)}
                          disabled={index === draft.frames.length - 1}
                          aria-label={`Move frame ${index + 1} later`}
                          className="flex h-10 w-9 items-center justify-center rounded text-muted disabled:opacity-25 active:bg-raise"
                        >
                          <ArrowIcon dir="down" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFrame(index)}
                          aria-label={`Remove frame ${index + 1}`}
                          className="flex h-10 w-9 items-center justify-center rounded text-muted active:bg-raise"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInput.current?.click()}
                disabled={uploading || atLimit}
                className="w-full"
              >
                {uploading && <Spinner />}
                {uploading
                  ? "Uploading"
                  : atLimit
                    ? `Limit of ${MAX_IMAGES_PER_WORKOUT} photos reached`
                    : draft.frames.length === 0
                      ? "Choose photos"
                      : "Add another photo"}
              </Button>
            </>
          )}

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            onChange={addPhotos}
            className="sr-only"
          />
        </div>

        {/* Target ------------------------------------------------------ */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-muted">Target</span>
          <div className="flex items-end gap-2">
            <div className="w-20">
              <Input
                type="number"
                min={1}
                max={99}
                value={draft.sets}
                onChange={(e) => set("sets", e.target.value)}
                placeholder="4"
                aria-label="Sets"
                className="tnum text-center"
              />
              <span className="mt-1 block text-center text-xs text-faint">sets</span>
            </div>
            <span className="pb-6 text-lg text-faint" aria-hidden="true">
              ×
            </span>
            <div className="flex-1">
              <Input
                value={draft.reps}
                onChange={(e) => set("reps", e.target.value)}
                placeholder="8"
                aria-label="Reps"
                className="text-center"
              />
              <span className="mt-1 block text-center text-xs text-faint">reps</span>
            </div>
          </div>

          <div className="mt-3 flex items-end gap-2">
            <div className="w-20">
              <Input
                type="number"
                min={0}
                max={180}
                value={draft.minutes}
                onChange={(e) => set("minutes", e.target.value)}
                placeholder="0"
                aria-label="Minutes"
                className="tnum text-center"
              />
              <span className="mt-1 block text-center text-xs text-faint">min</span>
            </div>
            <div className="w-20">
              <Input
                type="number"
                min={0}
                max={59}
                value={draft.seconds}
                onChange={(e) => set("seconds", e.target.value)}
                placeholder="30"
                aria-label="Seconds"
                className="tnum text-center"
              />
              <span className="mt-1 block text-center text-xs text-faint">sec</span>
            </div>
            <p className="flex-1 pb-6 text-xs leading-snug text-faint">
              For timed drills and holds. Leave empty if you count reps.
            </p>
          </div>
        </div>

        {/* Muscles ------------------------------------------------------ */}
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-muted">Target area</span>
            {draft.muscles.length > 0 && (
              <span className="truncate text-xs text-faint">
                {muscleSentence(draft.muscles)}
              </span>
            )}
          </div>
          <MusclePicker selected={draft.muscles} onChange={(m) => set("muscles", m)} />
          <div className="mt-3">
            <Input
              value={draft.targetArea}
              onChange={(e) => set("targetArea", e.target.value)}
              placeholder="Anything else about what this works"
              aria-label="Target area notes"
            />
          </div>
        </div>

        {/* Category ----------------------------------------------------- */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-muted">Category</span>
          <div className="rail -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {SUGGESTED_CATEGORIES.map((category) => (
              <Chip
                key={category}
                active={draft.category === category}
                onClick={() => set("category", draft.category === category ? "" : category)}
              >
                {category}
              </Chip>
            ))}
          </div>
          <Input
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="Or type your own"
          />
        </div>

        <Field label="Notes" hint="Cues, weight, or anything you want on the card mid-set.">
          <Textarea
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Keep the bar over mid-foot. 185 lb working weight."
          />
        </Field>

        {error && <Notice>{error}</Notice>}

        {workout && (
          <div className="border-t border-line-soft pt-4">
            {confirmDelete ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  Deleting removes it from the library and from every routine that uses it.
                  Finished sessions keep their record.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1"
                  >
                    Keep it
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={remove}
                    disabled={busy}
                    className="flex-1"
                  >
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
                Delete this workout
              </button>
            )}
          </div>
        )}
      </form>
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

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 6h12M8.5 6V4.5h3V6M6 6l.7 9.5h6.6L14 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
