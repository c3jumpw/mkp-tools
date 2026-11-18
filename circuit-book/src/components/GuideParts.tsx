/**
 * Pieces shared by the Guide page and the getting-started tour, so both
 * always show the same screenshots, legends and diagrams.
 */
import { FIGURES, type FigureName } from "@/app/guide/figures";

/* The rings and numbers drawn on every screenshot use this blue, so the legend
   badges match them. It is deliberately not lime: lime means state in the app,
   and a callout is not a state. */
const CALLOUT = "bg-[#5ab0ff] text-[#0e1110]";

/** The numbered list that explains a screenshot's callouts. */
export function Legend({ name, className = "" }: { name: FigureName; className?: string }) {
  const f = FIGURES[name];
  if (!f) return null; // only during a screenshot build, before figures.ts catches up
  return (
    <ol className={`space-y-2.5 ${className}`}>
      {f.legend.map(([label, text], i) => (
        <li key={label} className="flex gap-2.5">
          <span
            className={`tnum grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold ${CALLOUT}`}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className="min-w-0 text-sm leading-snug">
            <span className="font-semibold text-chalk">{label}.</span>{" "}
            <span className="text-muted">{text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** A whole annotated screenshot with its legend underneath. */
export function Shot({ name }: { name: FigureName }) {
  const f = FIGURES[name];
  if (!f) return null; // only during a screenshot build, before figures.ts catches up
  return (
    <figure className="mt-5">
      <div className="mx-auto max-w-[340px] overflow-hidden rounded-2xl border border-line">
        {/* Static screenshots from /public; nothing to gain from the image optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={f.src}
          width={f.width}
          height={f.height}
          alt={`${f.title}, with ${f.legend.length} numbered callouts`}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
      <figcaption className="mx-auto mt-3 max-w-[340px]">
        <span className="sr-only">{f.title}</span>
        <Legend name={name} />
      </figcaption>
    </figure>
  );
}

/**
 * The same screenshot cropped to the band its callouts sit in, for the tour,
 * where a whole phone screen inside a phone screen would be too small to read.
 */
export function Focus({ name, eager = false }: { name: FigureName; eager?: boolean }) {
  const f = FIGURES[name];
  if (!f) return null; // only during a screenshot build, before figures.ts catches up
  return (
    <div
      className="mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border border-line bg-surface"
      style={{ aspectRatio: `${f.width} / ${f.focus.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={f.src}
        width={f.width}
        height={f.height}
        alt={`${f.title}, with ${f.legend.length} numbered callouts`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="block h-auto w-full"
        style={{ transform: `translateY(-${(f.focus.y / f.height) * 100}%)` }}
      />
    </div>
  );
}

/** Set up once, then every workout runs Today → Session → History. */
export function Flow({ className = "mt-6" }: { className?: string }) {
  const setup: [string, string][] = [
    ["Library", "Each exercise once"],
    ["Routines", "Blocks, set to days"],
  ];
  const daily: [string, string][] = [
    ["Today", "What's due, plus your latest unfinished session"],
    ["Session", "One card per block"],
    ["History", "Every session; Resume if open"],
  ];
  return (
    <div
      className={`space-y-2 ${className}`}
      role="img"
      aria-label="Set up the Library and Routines once; each workout then goes Today, Session, History"
    >
      <FlowGroup label="Set up once" items={setup} />
      <Arrow label="on its days" />
      <FlowGroup label="Every workout" items={daily} />
    </div>
  );
}

function FlowGroup({ label, items }: { label: string; items: [string, string][] }) {
  return (
    <div className="rounded-xl border border-line-soft bg-surface p-3">
      <span className="block px-1 pb-2 text-xs font-medium text-faint">{label}</span>
      <div className="space-y-1.5">
        {items.map(([name, text], i) => (
          <div key={name}>
            {i > 0 && <Arrow />}
            <div className="rounded-lg border border-line px-3 py-2">
              <span className="ex block text-sm font-semibold text-chalk">{name}</span>
              <span className="block text-xs text-muted">{text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5 pl-5 text-faint" aria-hidden="true">
      <svg width="12" height="16" viewBox="0 0 12 16" fill="none">
        <path
          d="M6 1v13M1.5 9.5L6 14l4.5-4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label && <span className="text-xs">{label}</span>}
    </div>
  );
}

/** The order sets are worked in, for each kind of block. */
export function SetOrder({ className = "mt-4" }: { className?: string }) {
  const rows: { name: string; sub: string; rounds: string[][] }[] = [
    { name: "Straight sets", sub: "1 exercise, 4 sets", rounds: [["A1", "A2", "A3", "A4"]] },
    { name: "Superset", sub: "2 exercises, 3 rounds", rounds: [["A1", "B1"], ["A2", "B2"], ["A3", "B3"]] },
    {
      name: "Circuit",
      sub: "3 exercises, 3 rounds",
      rounds: [["A1", "B1", "C1"], ["A2", "B2", "C2"], ["A3", "B3", "C3"]],
    },
  ];
  return (
    <div className={`space-y-4 rounded-xl border border-line-soft bg-surface p-4 ${className}`}>
      {rows.map((row) => (
        <div key={row.name}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="ex text-sm font-semibold text-chalk">{row.name}</span>
            <span className="text-xs text-faint">{row.sub}</span>
          </div>
          <ol
            className="mt-2 flex flex-wrap gap-x-3 gap-y-2"
            aria-label={`${row.name} order: ${row.rounds.flat().join(", ")}`}
          >
            {row.rounds.map((round, r) => (
              <li key={r} className="flex flex-col items-center gap-1">
                <span className="flex gap-1">
                  {round.map((set) => (
                    <span
                      key={set}
                      className={`tnum grid h-7 w-8 place-items-center rounded-md border text-xs font-bold ${
                        set.startsWith("A")
                          ? "border-line bg-raise text-chalk"
                          : set.startsWith("B")
                            ? "border-chalk/40 text-chalk"
                            : "border-dashed border-chalk/40 text-chalk"
                      }`}
                    >
                      {set}
                    </span>
                  ))}
                </span>
                {row.rounds.length > 1 && (
                  <span className="text-[0.65rem] text-faint">Round {r + 1}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
      <p className="text-xs leading-relaxed text-faint">
        Letters are the exercises in the block, in order; the number is the round.
      </p>
    </div>
  );
}

/** Two-column-ish summary card, used for the offline lists. */
export function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <span className="ex block text-sm font-semibold text-chalk">{title}</span>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted marker:text-faint">
        {children}
      </ul>
    </div>
  );
}
