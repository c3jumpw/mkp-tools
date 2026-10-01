"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import AppFrame from "@/components/AppFrame";
import DayPicker, { DayStrip } from "@/components/DayPicker";
import { Button, EmptyState, Field, Input, LoadingPanel, Notice, Sheet, Spinner } from "@/components/ui";

type RoutineRow = {
  id: string;
  name: string;
  description: string | null;
  days: number[];
  stations: number;
};

export default function RoutinesPage() {
  const router = useRouter();
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("cb_routines")
        .select("id, name, description, cb_routine_days(day_of_week), cb_routine_items(id)")
        .order("name", { ascending: true });

      if (!active) return;
      if (error) {
        setError("Could not load your routines.");
      } else {
        setRoutines(
          (data ?? []).map((row) => {
            const r = row as unknown as {
              id: string;
              name: string;
              description: string | null;
              cb_routine_days: { day_of_week: number }[];
              cb_routine_items: { id: string }[];
            };
            return {
              id: r.id,
              name: r.name,
              description: r.description,
              days: r.cb_routine_days.map((d) => d.day_of_week).sort(),
              stations: r.cb_routine_items.length,
            };
          }),
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in again to create a routine.");

      const { data: routine, error } = await supabase
        .from("cb_routines")
        .insert({ name: trimmed, user_id: user.id })
        .select()
        .single();
      if (error) throw error;

      if (days.length > 0) {
        await supabase.from("cb_routine_days").insert(
          days.map((day) => ({
            routine_id: routine.id,
            day_of_week: day,
            user_id: user.id,
          })),
        );
      }

      router.push(`/routines/${routine.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that routine.");
      setBusy(false);
    }
  }

  return (
    <AppFrame
      title="Routines"
      action={
        <Button
          onClick={() => {
            setName("");
            setDays([]);
            setCreating(true);
          }}
          className="px-3.5"
        >
          New
        </Button>
      }
    >
      {loading ? (
        <LoadingPanel label="Loading your routines" />
      ) : error && routines.length === 0 ? (
        <div className="px-4 py-6">
          <Notice>{error}</Notice>
        </div>
      ) : routines.length === 0 ? (
        <EmptyState
          title="No routines yet"
          body="A routine is an ordered set of stations — Leg Day, Soccer Touch, whatever you run. Put it on the days you do it and it shows up on Today."
          action={<Button onClick={() => setCreating(true)}>Create a routine</Button>}
        />
      ) : (
        <ul className="mt-2">
          {routines.map((routine) => (
            <li key={routine.id} className="border-b border-line-soft last:border-0">
              <Link
                href={`/routines/${routine.id}`}
                className="block px-4 py-4 active:bg-surface"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="ex truncate text-[1.05rem] font-semibold">{routine.name}</h2>
                  <span className="tnum shrink-0 text-sm text-muted">
                    {routine.stations} {routine.stations === 1 ? "station" : "stations"}
                  </span>
                </div>
                <div className="mt-2.5">
                  <DayStrip days={routine.days} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="New routine"
        footer={
          <Button type="submit" form="routine-form" size="lg" disabled={busy || !name.trim()}>
            {busy && <Spinner />}
            Create routine
          </Button>
        }
      >
        <form id="routine-form" onSubmit={create} className="space-y-5">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Leg day"
              autoFocus
              required
            />
          </Field>

          <div>
            <span className="mb-2 block text-sm font-medium text-muted">Days</span>
            <DayPicker selected={days} onChange={setDays} />
            <p className="mt-2 text-xs text-faint">
              You can change this later, and a day can hold more than one routine.
            </p>
          </div>

          {error && <Notice>{error}</Notice>}
        </form>
      </Sheet>
    </AppFrame>
  );
}
