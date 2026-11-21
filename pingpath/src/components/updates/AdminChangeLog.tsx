"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { KIND_LABEL, type Audience, type Release } from "@/lib/changelog";
import { AudienceChip, ChangeIcon, KindChip } from "@/components/updates/parts";

type Order = "newest" | "oldest";
type Show = "all" | Audience;

const INSPECT = "https://vercel.com/c3-jumpw/pingpath/";

/** The admin change log: every update, who each change applies to, and downloads. */
export default function AdminChangeLog({ releases, liveDeployment }: { releases: Release[]; liveDeployment?: string }) {
  const [order, setOrder] = useState<Order>("newest");
  const [show, setShow] = useState<Show>("all");

  const current = releases[0];
  const totalChanges = releases.reduce((n, r) => n + r.changes.length, 0);
  const first = releases[releases.length - 1];

  const list = useMemo(() => {
    const filtered = releases
      .map((r) => ({ ...r, changes: show === "all" ? r.changes : r.changes.filter((c) => c.audience === show) }))
      .filter((r) => r.changes.length > 0);
    return order === "newest" ? filtered : [...filtered].reverse();
  }, [releases, order, show]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24">
      <Link href="/settings" className="text-sm">
        <span className="text-muted">← Settings</span>
      </Link>
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-teal mt-4">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3.5 5.5 6.2v4.9c0 4.1 2.8 7.7 6.5 8.9 3.7-1.2 6.5-4.8 6.5-8.9V6.2L12 3.5Z" />
        </svg>
        Admin
      </p>
      <h1 className="font-display text-2xl md:text-3xl mt-1">Change log</h1>
      <p className="text-sm text-muted mt-1.5 max-w-xl">
        Every update to PingPath, in date order, with who each change applies to. Only admins can open this page.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6" data-log-stats>
        <Stat label="Live version" value={current.version} sub={current.date} accent />
        <Stat label="Updates" value={String(releases.length)} sub={`since ${shortDay(first.isoDate)}, ${first.isoDate.slice(0, 4)}`} />
        <Stat label="Changes" value={String(totalChanges)} sub={`${releases.reduce((n, r) => n + r.changes.filter((c) => c.audience === "admin").length, 0)} admin only`} />
        <Stat label="Last updated" value={shortDay(current.isoDate)} sub={current.title} />
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface/40 p-4 text-sm" data-log-audience>
        <p className="font-medium">Who sees what</p>
        <ul className="mt-2 space-y-1.5 text-muted">
          <li className="flex items-start gap-2">
            <AudienceChip audience="everyone" />
            <span>Shows in everyone&apos;s What&apos;s new the first time they open PingPath after the update.</span>
          </li>
          <li className="flex items-start gap-2">
            <AudienceChip audience="admin" />
            <span>Shows only to admins. Regular users never see it.</span>
          </li>
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2" data-log-controls>
        <Segmented
          label="Order"
          value={order}
          onChange={setOrder}
          options={[
            ["newest", "Newest first"],
            ["oldest", "Oldest first"],
          ]}
        />
        <Segmented
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            ["all", "All"],
            ["everyone", "Everyone"],
            ["admin", "Admin only"],
          ]}
        />
        <span className="flex gap-2 sm:ml-auto" data-log-download>
          <button
            onClick={() => download(`pingpath-change-log-${today()}.csv`, toCsv(releases), "text/csv")}
            className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2/70"
          >
            ↓ CSV
          </button>
          <button
            onClick={() => download(`pingpath-change-log-${today()}.json`, toJson(releases), "application/json")}
            className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2/70"
          >
            ↓ JSON
          </button>
        </span>
      </div>

      <ol className="relative mt-6 border-l border-line ml-3 space-y-6" data-log-timeline>
        {list.map((r) => {
          const live = r.version === current.version;
          return (
            <li key={r.version} className="relative pl-6">
              <span
                className={`absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full ring-4 ring-bg ${live ? "bg-accent" : "bg-teal"}`}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-xs rounded-md border border-line px-1.5 py-[1px] text-muted">{r.version}</span>
                <h2 className="font-display text-lg leading-tight">{r.title}</h2>
                {live && (
                  <span className="rounded-full bg-accent/15 border border-accent/40 text-accent text-[11px] px-2 py-[1px]">Live now</span>
                )}
              </div>
              <p className="text-xs text-muted mt-1">
                <time dateTime={r.isoDate}>{r.date}</time>
                {r.reconstructed && (
                  <span title="Release notes weren't kept yet, so this entry was written afterwards from the deploy history.">
                    {" "}
                    · written afterwards from the deploy history
                  </span>
                )}
              </p>
              {r.summary && <p className="text-sm text-muted mt-1.5">{r.summary}</p>}
              <ul className="mt-3 rounded-2xl border border-line divide-y divide-line overflow-hidden">
                {r.changes.map((c) => (
                  <li key={c.title} className="flex gap-3 px-3.5 py-3 bg-surface/30">
                    <ChangeIcon area={c.area} kind={c.kind} small />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <KindChip kind={c.kind} />
                        <AudienceChip audience={c.audience} />
                        <span className="text-[11px] text-muted">{c.area}</span>
                      </div>
                      <p className="text-sm font-medium mt-1">{c.title}</p>
                      {c.detail && <p className="text-sm text-muted">{c.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              {(r.deployments?.length || (live && liveDeployment)) && (
                <details className="mt-2 text-xs text-muted">
                  <summary className="cursor-pointer hover:text-ink">
                    Deploy record{(r.deployments?.length || 1) > 1 ? `s (${r.deployments?.length})` : ""}
                  </summary>
                  <ul className="mt-1.5 space-y-1 font-mono">
                    {(r.deployments?.length ? r.deployments : [liveDeployment as string]).map((d) => (
                      <li key={d}>
                        <a href={INSPECT + d.replace(/^dpl_/, "")} target="_blank" rel="noreferrer" className="hover:text-accent">
                          {d}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-10 rounded-2xl border border-line p-4 text-sm text-muted space-y-1.5">
        <p className="text-ink font-medium">How this log is kept</p>
        <p>
          Every update adds an entry here, and publishing stops if it doesn&apos;t. The log is also kept as a plain data file
          in the app&apos;s code (src/data/changelog.json), so it&apos;s in every backup.
        </p>
        <p>
          To make someone else an admin: Supabase › project <b className="text-ink">mkp-tools</b> › Table editor ›{" "}
          <code className="text-ink">pingpath_roles</code> › add a row with their user id and role <code className="text-ink">admin</code>.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${accent ? "border-accent/40 bg-accent/[0.07]" : "border-line bg-surface/40"}`}>
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className={`font-display text-xl leading-tight mt-0.5 ${accent ? "text-accent" : ""}`}>{value}</p>
      <p className="text-xs text-muted truncate mt-0.5">{sub}</p>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-line p-0.5 text-sm">
      {options.map(([v, text]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`px-2.5 py-1 rounded-md ${value === v ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function shortDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** One row per change, oldest first, for spreadsheets. */
function toCsv(releases: Release[]) {
  const head = ["version", "date", "release", "kind", "area", "audience", "change", "detail", "tour_step", "reconstructed", "deployments"];
  const rows = [...releases].reverse().flatMap((r) =>
    r.changes.map((c) => [
      r.version,
      r.isoDate,
      r.title,
      KIND_LABEL[c.kind],
      c.area,
      c.audience,
      c.title,
      c.detail || "",
      c.slide || "",
      r.reconstructed ? "yes" : "no",
      (r.deployments || []).join(" "),
    ])
  );
  return [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function toJson(releases: Release[]) {
  return (
    JSON.stringify(
      {
        app: "PingPath",
        exported: new Date().toISOString(),
        current_version: releases[0].version,
        releases: releases.map((r) => ({
          version: r.version,
          date: r.isoDate,
          title: r.title,
          summary: r.summary,
          reconstructed: r.reconstructed || false,
          deployments: r.deployments || [],
          changes: r.changes,
        })),
      },
      null,
      2
    ) + "\n"
  );
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
