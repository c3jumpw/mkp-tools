"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { formatDateWithWeekday, formatElapsed } from "@/lib/format";
import AppFrame from "@/components/AppFrame";
import { roleOf } from "@/lib/roles";
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
        .select("id, routine_name, started_at, completed_at, cb_session_blocks(rounds, cb_session_items(id)), cb_session_sets(id)")
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
              cb_session_blocks: { rounds: number; cb_session_items: { id: string }[] }[];
              cb_session_sets: { id: string }[];
            };
            return {
              id: r.id,
              routine_name: r.routine_name,
              started_at: r.started_at,
              completed_at: r.completed_at,
              total: r.cb_session_blocks.reduce(
                (sum, b) => sum + b.cb_session_items.length * b.rounds,
                0,
              ),
              done: r.cb_session_sets.length,
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
                    {Array.from({ length: Math.min(row.total, 40) }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < Math.round((row.done / Math.max(row.total, 1)) * Math.min(row.total, 40))
                            ? "bg-lime"
                            : "bg-line"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="tnum mt-2 text-sm text-muted">
                    {row.done} of {row.total} sets
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

      <AdminLinks />

      <div className="px-4 pt-8">
        <SignOut />
      </div>
    </AppFrame>
  );
}

/** Admin-only pages, listed for admins and invisible to everyone else. */
function AdminLinks() {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => active && setAdmin(roleOf(data.user) === "admin"));
    return () => {
      active = false;
    };
  }, []);

  if (!admin) return null;

  return (
    <section aria-labelledby="admin-heading" className="px-4 pt-8">
      <h2 id="admin-heading" className="text-xs font-semibold tracking-wide text-faint uppercase">
        Admin
      </h2>
      <Link
        href="/admin/changelog"
        className="mt-2 flex items-center gap-3.5 rounded-xl border border-line bg-surface p-4 active:bg-raise"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-raise text-chalk" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M10 5.5V10l3 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.2 8.2A7 7 0 1 1 4 13.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M2.6 4.6v3.8h3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="ex block text-[0.95rem] font-semibold text-chalk">Change log</span>
          <span className="block text-sm text-muted">Every update to Circuit Book, newest first</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="shrink-0 text-faint">
          <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </section>
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
