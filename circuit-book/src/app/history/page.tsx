"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatDateWithWeekday, formatElapsed } from "@/lib/format";
import AppFrame from "@/components/AppFrame";
import { Button, EmptyState, LoadingPanel, Notice } from "@/components/ui";

type Row = {
  id: string;
  routine_name: string;
  started_at: string;
  completed_at: string | null;
  total: number;
  done: number;
};

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <History />
    </Suspense>
  );
}

function History() {
  const params = useSearchParams();
  const justFinished = params.get("just");

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase
        .from("cb_sessions")
        .select("id, routine_name, started_at, completed_at, cb_session_items(completed_at)")
        .order("started_at", { ascending: false })
        .limit(60);

      if (!active) return;
      if (error) {
        setError("Could not load your history.");
      } else {
        setRows(
          (data ?? []).map((row) => {
            const r = row as unknown as {
              id: string;
              routine_name: string;
              started_at: string;
              completed_at: string | null;
              cb_session_items: { completed_at: string | null }[];
            };
            return {
              id: r.id,
              routine_name: r.routine_name,
              started_at: r.started_at,
              completed_at: r.completed_at,
              total: r.cb_session_items.length,
              done: r.cb_session_items.filter((i) => i.completed_at).length,
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

  return (
    <AppFrame title="History">
      {loading ? (
        <LoadingPanel label="Loading history" />
      ) : error ? (
        <div className="px-4 py-6">
          <Notice>{error}</Notice>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No sessions logged yet"
          body="Once you work through a routine it lands here, with what you finished and how long it took."
        />
      ) : (
        <ul className="mt-2">
          {rows.map((row) => {
            const isNew = row.id === justFinished;
            return (
              <li key={row.id} className="border-b border-line-soft last:border-0">
                <div className={`px-4 py-4 ${isNew ? "bg-surface" : ""}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="ex truncate text-[1.05rem] font-semibold">
                      {row.routine_name}
                    </h2>
                    <span className="shrink-0 text-sm text-muted">
                      {formatDateWithWeekday(row.started_at)}
                    </span>
                  </div>

                  <div className="mt-2.5 flex gap-0.5" aria-hidden="true">
                    {Array.from({ length: row.total }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < row.done ? "bg-lime" : "bg-line"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="tnum mt-2 text-sm text-muted">
                    {row.done} of {row.total} stations
                    {row.completed_at && `, ${formatElapsed(row.started_at, row.completed_at)}`}
                    {!row.completed_at && ", still open"}
                  </p>

                  {!row.completed_at && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.location.href = `/session/${row.id}`;
                        }}
                        className="px-3.5"
                      >
                        Resume
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-4 pt-8">
        <SignOut />
      </div>
    </AppFrame>
  );
}

function SignOut() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const supabase = supabaseBrowser();
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
      className="text-sm text-muted underline underline-offset-4 disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
