"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ChangeEntry } from "@/lib/changelog";
import { AudienceTag, KindBadge, KIND_LABEL, formatEntryDate, formatMonth, type Kind } from "@/components/ChangeBits";
import { Chip } from "@/components/ui";

type KindFilter = "all" | Kind;
type AudienceFilter = "all" | "everyone" | "admins";

const KINDS: Kind[] = ["new", "improved", "fixed", "internal"];

export default function ChangelogView({ entries, repoUrl }: { entries: ChangeEntry[]; repoUrl: string }) {
  const [kind, setKind] = useState<KindFilter>("all");
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<Kind, number> = { new: 0, improved: 0, fixed: 0, internal: 0 };
    for (const e of entries) c[e.kind] += 1;
    return c;
  }, [entries]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = entries.filter(
      (e) =>
        (kind === "all" || e.kind === kind) &&
        (audience === "all" || e.audience === audience) &&
        (!q ||
          [e.title, e.summary, ...(e.details ?? []), ...(e.commits ?? [])].join(" ").toLowerCase().includes(q)),
    );
    return list.sort((a, b) => (newestFirst ? b.seq - a.seq : a.seq - b.seq));
  }, [entries, kind, audience, newestFirst, query]);

  // Group by month, keeping the sort order.
  const months: { month: string; items: ChangeEntry[] }[] = [];
  for (const e of shown) {
    const m = formatMonth(e.date);
    if (months.at(-1)?.month !== m) months.push({ month: m, items: [] });
    months.at(-1)!.items.push(e);
  }

  const first = entries.reduce((a, e) => (e.date < a ? e.date : a), entries[0]?.date ?? "");
  const last = entries.reduce((a, e) => (e.date > a ? e.date : a), "");

  return (
    <div className="pb-6">
      <div className="px-4 pt-5">
        <p className="text-sm leading-relaxed text-muted">
          Every change to Circuit Book since launch. Only admins can see this page.
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Changes" value={String(entries.length)} />
          <Stat label="Since" value={first ? formatEntryDate(first).replace(/^\w+, /, "") : "—"} small />
          <Stat label="Latest" value={last ? formatEntryDate(last).replace(/^\w+, /, "") : "—"} small />
        </dl>
      </div>

      <div className="px-4 pt-5">
        <label className="sr-only" htmlFor="cl-search">
          Search the change log
        </label>
        <input
          id="cl-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search changes"
          className="min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[0.95rem] text-chalk placeholder:text-faint focus:border-lime focus:outline-none"
        />
      </div>

      <div role="group" aria-label="Filter by kind" className="rail flex gap-2 overflow-x-auto px-4 pt-3">
        <Chip active={kind === "all"} onClick={() => setKind("all")}>
          All
        </Chip>
        {KINDS.map((k) => (
          <Chip key={k} active={kind === k} onClick={() => setKind(k)} disabled={counts[k] === 0}>
            {KIND_LABEL[k]} <span className="tnum ml-1.5 opacity-70">{counts[k]}</span>
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <div role="group" aria-label="Filter by audience" className="flex gap-2">
          {(
            [
              ["all", "Anyone"],
              ["everyone", "Everyone"],
              ["admins", "Admins only"],
            ] as [AudienceFilter, string][]
          ).map(([a, label]) => (
            <Chip key={a} active={audience === a} onClick={() => setAudience(a)} className="px-2.5! text-xs!">
              {label}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setNewestFirst((v) => !v)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-xs font-medium text-muted active:bg-raise"
          aria-label={newestFirst ? "Newest first. Switch to oldest first" : "Oldest first. Switch to newest first"}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d={newestFirst ? "M10 4v12M5.5 11.5L10 16l4.5-4.5" : "M10 16V4M5.5 8.5L10 4l4.5 4.5"}
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {newestFirst ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {months.length === 0 ? (
        <p className="px-4 pt-10 text-center text-sm text-muted">No changes match.</p>
      ) : (
        months.map(({ month, items }) => (
          <section key={month} aria-label={month} className="px-4 pt-6">
            <h2 className="ex text-sm font-semibold text-faint">{month}</h2>
            <ol className="mt-3">
              {items.map((e, i) => (
                <Entry key={e.seq} e={e} repoUrl={repoUrl} last={i === items.length - 1} />
              ))}
            </ol>
          </section>
        ))
      )}

      <div className="px-4 pt-8">
        <h2 className="text-xs font-semibold tracking-wide text-faint uppercase">Export</h2>
        <p className="mt-1 text-sm text-muted">The whole log, for spreadsheets or records.</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => download("circuit-book-changelog.json", JSON.stringify(entries, null, 2), "application/json")}
            className="min-h-11 flex-1 rounded-xl border border-line text-sm font-semibold text-chalk active:bg-raise"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={() => download("circuit-book-changelog.csv", toCsv(entries, repoUrl), "text/csv")}
            className="min-h-11 flex-1 rounded-xl border border-line text-sm font-semibold text-chalk active:bg-raise"
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-line-soft bg-surface px-3 py-2.5">
      <dt className="text-[0.7rem] font-medium text-faint">{label}</dt>
      <dd className={`tnum mt-0.5 font-bold text-chalk ${small ? "text-sm" : "ex text-xl leading-tight"}`}>{value}</dd>
    </div>
  );
}

function Entry({ e, repoUrl, last }: { e: ChangeEntry; repoUrl: string; last: boolean }) {
  return (
    <li className="relative flex gap-3">
      {/* The timeline: a dot per change, joined by a line. */}
      <div className="flex w-3 shrink-0 flex-col items-center" aria-hidden="true">
        <span
          className={`mt-[1.15rem] h-2.5 w-2.5 shrink-0 rounded-full ${
            e.kind === "internal" ? "border border-faint" : "bg-chalk"
          }`}
        />
        {!last && <span className="w-px flex-1 bg-line" />}
      </div>

      <article className="mb-3 min-w-0 flex-1 rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <KindBadge kind={e.kind} />
          <AudienceTag audience={e.audience} />
          <span className="tnum ml-auto text-xs text-faint">#{e.seq}</span>
        </div>
        <p className="mt-2 text-xs text-muted">{formatEntryDate(e.date)}</p>
        <h3 className="ex mt-0.5 text-[1.05rem] leading-snug font-bold text-chalk">{e.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{e.summary}</p>

        {e.details && e.details.length > 0 && (
          <ul className="mt-2.5 list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted marker:text-faint">
            {e.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line-soft pt-2.5 text-xs text-faint">
          <span>{e.announce && e.kind !== "internal" ? "Shown in What's new" : "Not announced to users"}</span>
          {e.commits?.map((c) => (
            <a
              key={c}
              href={`${repoUrl}/commit/${c}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-muted underline underline-offset-2"
            >
              {c}
            </a>
          ))}
          {e.link && (
            <Link href={e.link.href} className="ml-auto font-semibold text-chalk underline underline-offset-2">
              {e.link.label}
            </Link>
          )}
        </div>
      </article>
    </li>
  );
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCsv(entries: ChangeEntry[], repoUrl: string): string {
  const cols = ["seq", "date", "kind", "audience", "announced", "title", "summary", "details", "link", "commits"];
  const cell = (v: string | number | boolean) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [...entries]
    .sort((a, b) => a.seq - b.seq)
    .map((e) =>
      [
        e.seq,
        e.date,
        e.kind,
        e.audience,
        e.announce && e.kind !== "internal",
        e.title,
        e.summary,
        (e.details ?? []).join(" | "),
        e.link?.href ?? "",
        (e.commits ?? []).map((c) => `${repoUrl}/commit/${c}`).join(" "),
      ]
        .map(cell)
        .join(","),
    );
  return [cols.join(","), ...rows].join("\n") + "\n";
}
