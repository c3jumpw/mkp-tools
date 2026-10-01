"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Workout } from "@/lib/database.types";
import { formatTarget } from "@/lib/format";
import { MUSCLES, muscleLabel, muscleSentence } from "@/lib/muscles";
import AppFrame from "@/components/AppFrame";
import Thumb from "@/components/Thumb";
import WorkoutEditor from "@/components/WorkoutEditor";
import { Button, Chip, EmptyState, Input, LoadingPanel, Notice, Tag } from "@/components/ui";

export default function LibraryPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Workout | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      if (active) setUserId(user.id);

      const { data, error } = await supabase
        .from("cb_workouts")
        .select("*")
        .order("name", { ascending: true });

      if (!active) return;
      if (error) setError("Could not load your library. Pull down to retry.");
      else setWorkouts(data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const found = new Set<string>();
    workouts.forEach((w) => w.category && found.add(w.category));
    return ["All", ...Array.from(found).sort()];
  }, [workouts]);

  // Only muscles actually used in the library, in vocabulary order, so the
  // filter rail never offers something with nothing behind it.
  const muscleFilters = useMemo(() => {
    const found = new Set<string>();
    workouts.forEach((w) => w.muscles?.forEach((m) => found.add(m)));
    return MUSCLES.filter((m) => found.has(m.id)).map((m) => m.id);
  }, [workouts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workouts.filter((w) => {
      if (filter !== "All" && w.category !== filter) return false;
      if (muscleFilter && !(w.muscles ?? []).includes(muscleFilter)) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        (w.description ?? "").toLowerCase().includes(q) ||
        (w.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [workouts, filter, query, muscleFilter]);

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(workout: Workout) {
    setEditing(workout);
    setSheetOpen(true);
  }

  function handleSaved(saved: Workout) {
    setWorkouts((list) => {
      const exists = list.some((w) => w.id === saved.id);
      const next = exists ? list.map((w) => (w.id === saved.id ? saved : w)) : [...list, saved];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function handleDeleted(id: string) {
    setWorkouts((list) => list.filter((w) => w.id !== id));
  }

  return (
    <AppFrame
      title="Library"
      action={
        <Button onClick={openNew} className="px-3.5">
          <PlusIcon />
          New
        </Button>
      }
    >
      {loading ? (
        <LoadingPanel label="Loading your library" />
      ) : error ? (
        <div className="px-4 py-6">
          <Notice>{error}</Notice>
        </div>
      ) : workouts.length === 0 ? (
        <EmptyState
          title="Nothing in the library yet"
          body="Add the lifts and drills you actually do. Each one can carry a photo, a target, and the cues you want to see mid-set."
          action={<Button onClick={openNew}>Add your first workout</Button>}
        />
      ) : (
        <>
          <div className="px-4 pt-4 pb-1">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workouts"
              aria-label="Search workouts"
            />
          </div>

          {categories.length > 1 && (
            <div className="rail flex gap-2 overflow-x-auto px-4 py-3">
              {categories.map((category) => (
                <Chip
                  key={category}
                  active={filter === category}
                  onClick={() => setFilter(category)}
                >
                  {category}
                </Chip>
              ))}
            </div>
          )}

          {muscleFilters.length > 0 && (
            <div className="rail flex gap-2 overflow-x-auto px-4 pb-3">
              {muscleFilters.map((id) => (
                <Chip
                  key={id}
                  active={muscleFilter === id}
                  onClick={() => setMuscleFilter(muscleFilter === id ? null : id)}
                >
                  {muscleLabel(id)}
                </Chip>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState
              title="No matches"
              body="Nothing in the library fits that. Try a different word, or clear the filters."
            />
          ) : (
            <ul className="mt-1">
              {visible.map((workout) => (
                <li key={workout.id} className="border-b border-line-soft last:border-0">
                  <button
                    type="button"
                    onClick={() => openEdit(workout)}
                    className="flex w-full items-center gap-3.5 px-4 py-3 text-left active:bg-surface"
                  >
                    <Thumb
                      path={workout.image_path}
                      alt=""
                      className="h-14 w-14 shrink-0"
                      rounded="rounded-lg"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="ex block truncate font-semibold">{workout.name}</span>
                      <span className="mt-1 flex items-center gap-2">
                        {(() => {
                          const target = formatTarget({
                            sets: workout.target_sets,
                            reps: workout.target_reps,
                            durationSeconds: workout.target_duration_seconds,
                          });
                          return target ? (
                            <span className="tnum text-sm text-muted">{target}</span>
                          ) : null;
                        })()}
                        {workout.category && <Tag>{workout.category}</Tag>}
                        {workout.muscles?.length > 0 && (
                          <span className="truncate text-xs text-faint">
                            {muscleSentence(workout.muscles)}
                          </span>
                        )}
                      </span>
                    </span>
                    <ChevronIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {userId && (
        <WorkoutEditor
          open={sheetOpen}
          workout={editing}
          userId={userId}
          onClose={() => setSheetOpen(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </AppFrame>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-faint"
    >
      <path
        d="M7.5 4.5l6 5.5-6 5.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
