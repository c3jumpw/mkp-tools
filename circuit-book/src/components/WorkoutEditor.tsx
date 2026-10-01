"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { uploadWorkoutImage, deleteWorkoutImage, forgetSignedUrl } from "@/lib/images";
import { SUGGESTED_CATEGORIES, type Workout } from "@/lib/database.types";
import { Button, Chip, Field, Input, Notice, Sheet, Spinner, Textarea } from "@/components/ui";
import Thumb from "@/components/Thumb";

type Draft = {
  name: string;
  description: string;
  category: string;
  sets: string;
  reps: string;
  minutes: string;
  seconds: string;
  imagePath: string | null;
};

function toDraft(workout: Workout | null): Draft {
  const total = workout?.target_duration_seconds ?? 0;
  return {
    name: workout?.name ?? "",
    description: workout?.description ?? "",
    category: workout?.category ?? "",
    sets: workout?.target_sets ? String(workout.target_sets) : "",
    reps: workout?.target_reps ?? "",
    minutes: total ? String(Math.floor(total / 60)) : "",
    seconds: total ? String(total % 60) : "",
    imagePath: workout?.image_path ?? null,
  };
}

/**
 * Add or change one workout. Reached from the library, from the routine
 * builder, and from a running session, so it has to work as a self-contained
 * sheet wherever it is opened.
 */
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
  const [draft, setDraft] = useState<Draft>(() => toDraft(workout));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Reset whenever a different workout is opened.
  useEffect(() => {
    if (open) {
      setDraft(toDraft(workout));
      setError(null);
      setConfirmDelete(false);
    }
  }, [open, workout]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  async function pickPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const path = await uploadWorkoutImage(file, userId);
      // Drop the old photo once the new one is safely up.
      if (draft.imagePath) {
        void deleteWorkoutImage(draft.imagePath);
        forgetSignedUrl(draft.imagePath);
      }
      set("imagePath", path);
    } catch {
      setError("That photo would not upload. Check your connection and try again.");
    } finally {
      setUploading(false);
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
      image_path: draft.imagePath,
    };

    try {
      const supabase = supabaseBrowser();
      if (workout) {
        const { data, error } = await supabase
          .from("cb_workouts")
          .update(payload)
          .eq("id", workout.id)
          .select()
          .single();
        if (error) throw error;
        onSaved(data);
      } else {
        const { data, error } = await supabase
          .from("cb_workouts")
          .insert({ ...payload, user_id: userId })
          .select()
          .single();
        if (error) throw error;
        onSaved(data);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!workout) return;
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.from("cb_workouts").delete().eq("id", workout.id);
      if (error) throw error;
      if (workout.image_path) void deleteWorkoutImage(workout.image_path);
      onDeleted?.(workout.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that. Try again.");
      setBusy(false);
    }
  }

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
      <form id="workout-form" onSubmit={save} className="space-y-5">
        <Field label="Name">
          <Input
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Back squat"
            autoFocus={!workout}
            required
          />
        </Field>

        {/* Photo ------------------------------------------------------- */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-muted">Photo</span>
          <div className="flex items-center gap-3">
            <Thumb
              path={draft.imagePath}
              alt={draft.name || "Workout photo"}
              className="h-20 w-20 shrink-0"
              rounded="rounded-xl"
            />
            <div className="flex flex-1 flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                {uploading && <Spinner />}
                {uploading ? "Uploading" : draft.imagePath ? "Replace photo" : "Choose photo"}
              </Button>
              {draft.imagePath && !uploading && (
                <button
                  type="button"
                  onClick={() => {
                    if (draft.imagePath) {
                      void deleteWorkoutImage(draft.imagePath);
                      forgetSignedUrl(draft.imagePath);
                    }
                    set("imagePath", null);
                  }}
                  className="self-start px-1 text-sm text-muted underline underline-offset-4"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={pickPhoto}
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
                className="text-center tnum"
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
                className="text-center tnum"
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
                className="text-center tnum"
              />
              <span className="mt-1 block text-center text-xs text-faint">sec</span>
            </div>
            <p className="flex-1 pb-6 text-xs leading-snug text-faint">
              For timed drills and holds. Leave empty if you count reps.
            </p>
          </div>
        </div>

        {/* Category ---------------------------------------------------- */}
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
