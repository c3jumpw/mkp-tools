"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { DAY_FULL, estimateMinutes, todayIndex } from "@/lib/format";
import AppFrame from "@/components/AppFrame";
import { Button, EmptyState, LoadingPanel, Notice, Spinner } from "@/components/ui";

type TodayRoutine = {
  id: string;
  name: string;
  stations: { sets: number | null; durationSeconds: number | null }[];
};

type OpenSession = {
  id: string;
  routine_name: string;
  total: number;
  done: number;
};

export default function TodayPage() {
  const router = useRouter();
  const [scheduled, setScheduled] = useState<TodayRoutine[]>([]);
  const [others, setOthers] = useState<{ id: string; name: string }[]>([]);
  const [open, setOpen] = useState<OpenSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);

  const day = todayIndex();

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [routinesRes, sessionRes] = await Promise.all([
        supabase
          .from("cb_routines")
          .select(
            "id, name, cb_routine_days(day_of_week), cb_routine_items(sets_override, workout:cb_workouts(target_sets, target_duration_seconds))",
          )
          .order("name"),
        supabase
          .from("cb_sessions")
          .select("id, routine_name, cb_session_items(completed_at)")
          .is("completed_at", null)
          .order("started_at", { ascending: false })
          .limit(1),
      ]);

      if (!active) return;

      if (routinesRes.error) {
        setError("Could not load today's routines.");
      } else {
        const rows = (routinesRes.data ?? []) as unknown as {
          id: string;
          name: string;
          cb_routine_days: { day_of_week: number }[];
          cb_routine_items: {
            sets_override: number | null;
            workout: { target_sets: number | null; target_duration_seconds: number | null } | null;
          }[];
        }[];

        const forToday: TodayRoutine[] = [];
        const rest: { id: string; name: string }[] = [];

        for (const row of rows) {
          const stations = row.cb_routine_items.map((item) => ({
            sets: item.sets_override ?? item.workout?.target_sets ?? null,
            durationSeconds: item.workout?.target_duration_seconds ?? null,
          }));
          if (row.cb_routine_days.some((d) => d.day_of_week === day)) {
            forToday.push({ id: row.id, name: row.name, stations });
          } else {
            rest.push({ id: row.id, name: row.name });
          }
        }

        setScheduled(forToday);
        setOthers(rest);
      }

      const session = sessionRes.data?.[0] as
        | { id: string; routine_name: string; cb_session_items: { completed_at: string | null }[] }
        | undefined;
      if (session) {
        setOpen({
          id: session.id,
          routine_name: session.routine_name,
          total: session.cb_session_items.length,
          done: session.cb_session_items.filter((i) => i.completed_at).length,
        });
      }

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [day]);

  async function start(routineId: string, routineName: string) {
    setStarting(routineId);
    const supabase = supabaseBrowser();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");

      const { data: items, error: itemsError } = await supabase
        .from("cb_routine_items")
        .select("*, workout:cb_workouts(*)")
        .eq("routine_id", routineId)
        .order("position");
      if (itemsError) throw itemsError;
      if (!items || items.length === 0) {
        setError("That routine has no stations yet.");
        setStarting(null);
        return;
      }

      const { data: session, error } = await supabase
        .from("cb_sessions")
        .insert({ routine_id: routineId, routine_name: routineName, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      const rows = items.map((item, i) => {
        const w = (item as { workout: Record<string, unknown> | null }).workout;
        return {
          session_id: session.id,
          user_id: user.id,
          workout_id: item.workout_id,
          workout_name: (w?.name as string) ?? "Workout",
          description: item.notes ?? ((w?.description as string | null) ?? null),
          category: (w?.category as string | null) ?? null,
          target_sets: item.sets_override ?? ((w?.target_sets as number | null) ?? null),
          target_reps: item.reps_override ?? ((w?.target_reps as string | null) ?? null),
          target_duration_seconds: (w?.target_duration_seconds as number | null) ?? null,
          image_path: (w?.image_path as string | null) ?? null,
          position: i,
        };
      });

      const { error: insertError } = await supabase.from("cb_session_items").insert(rows);
      if (insertError) throw insertError;

      router.push(`/session/${session.id}`);
    } catch {
      setError("Could not start that session. Check your connection and try again.");
      setStarting(null);
    }
  }

  return (
    <AppFrame>
      <div className="pad-safe-t px-4 pt-6">
        <p className="text-sm font-medium text-muted">{DAY_FULL[day]}</p>
        <h1 className="ex-tight mt-1 text-[2.6rem] leading-[0.92] font-bold">
          {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric" })}
        </h1>
      </div>

      {loading ? (
        <LoadingPanel label="Checking today" />
      ) : (
        <>
          {error && (
            <div className="px-4 pt-5">
              <Notice>{error}</Notice>
            </div>
          )}

          {open && (
            <section className="px-4 pt-7">
              <h2 className="mb-2.5 text-sm font-semibold text-muted">In progress</h2>
              <Link
                href={`/session/${open.id}`}
                className="block overflow-hidden rounded-xl border border-lime bg-surface active:bg-raise"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="ex truncate text-lg font-bold">{open.routine_name}</p>
                    <p className="tnum mt-1 text-sm text-muted">
                      {open.done} of {open.total} done
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-lime px-4 py-2.5 text-sm font-semibold text-base">
                    Resume
                  </span>
                </div>
                <div className="flex gap-0.5 px-4 pb-4" aria-hidden="true">
                  {Array.from({ length: open.total }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${i < open.done ? "bg-lime" : "bg-line"}`}
                    />
                  ))}
                </div>
              </Link>
            </section>
          )}

          <section className="px-4 pt-7">
            {scheduled.length === 0 ? (
              others.length === 0 ? (
                <EmptyState
                  title="Nothing scheduled yet"
                  body="Build a routine, put it on the days you train, and it will be waiting here when that day comes around."
                  action={
                    <Button onClick={() => router.push("/routines")}>Create a routine</Button>
                  }
                />
              ) : (
                <div className="rounded-xl border border-dashed border-line px-5 py-8 text-center">
                  <p className="text-sm leading-relaxed text-muted">
                    Nothing is set for {DAY_FULL[day]}. Start any routine below, or put one on
                    this day so it shows up on its own.
                  </p>
                </div>
              )
            ) : (
              <>
                <h2 className="mb-2.5 text-sm font-semibold text-muted">
                  {open ? "Also scheduled" : "Scheduled"}
                </h2>
                <ul className="space-y-2.5">
                  {scheduled.map((routine) => (
                    <li
                      key={routine.id}
                      className="overflow-hidden rounded-xl border border-line bg-surface"
                    >
                      <div className="flex items-center justify-between gap-3 px-4 py-4">
                        <div className="min-w-0">
                          <p className="ex truncate text-lg font-bold">{routine.name}</p>
                          <p className="tnum mt-1 text-sm text-muted">
                            {routine.stations.length}{" "}
                            {routine.stations.length === 1 ? "station" : "stations"}
                            {routine.stations.length > 0 &&
                              `, about ${estimateMinutes(routine.stations)} min`}
                          </p>
                        </div>
                        <Button
                          onClick={() => start(routine.id, routine.name)}
                          disabled={starting !== null || routine.stations.length === 0}
                          className="shrink-0"
                        >
                          {starting === routine.id && <Spinner />}
                          Start
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {others.length > 0 && (
            <section className="px-4 pt-8">
              <h2 className="mb-1 text-sm font-semibold text-muted">Other routines</h2>
              <ul>
                {others.map((routine) => (
                  <li key={routine.id} className="border-b border-line-soft last:border-0">
                    <div className="flex items-center justify-between gap-3 py-3">
                      <Link
                        href={`/routines/${routine.id}`}
                        className="ex min-w-0 flex-1 truncate font-semibold"
                      >
                        {routine.name}
                      </Link>
                      <Button
                        variant="outline"
                        onClick={() => start(routine.id, routine.name)}
                        disabled={starting !== null}
                        className="shrink-0 px-3.5"
                      >
                        {starting === routine.id && <Spinner />}
                        Start
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </AppFrame>
  );
}
