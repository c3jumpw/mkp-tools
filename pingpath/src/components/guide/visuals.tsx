/**
 * Static illustration pieces for the in-app guide: a phone frame, numbered
 * markers, legends and flow strips. Everything is drawn with the app's own
 * colors and spans (no real buttons), so the pictures look like PingPath but
 * can't be mistaken for working controls.
 */

type Tab = "home" | "contacts" | "blasts" | "tags" | "settings";

const NAV: { key: Tab; label: string; d: string }[] = [
  { key: "home", label: "Home", d: "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z" },
  { key: "contacts", label: "Contacts", d: "M12 4.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4ZM5 20c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5" },
  { key: "blasts", label: "Blasts", d: "M6 9.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm6 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm6 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z" },
  { key: "tags", label: "Tags", d: "M11 4h6a2 2 0 0 1 2 2v6l-8.5 8.5a1.5 1.5 0 0 1-2.1 0l-5.9-5.9a1.5 1.5 0 0 1 0-2.1L11 4Z" },
  { key: "settings", label: "Settings", d: "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm7.4 4a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.4 1a7.7 7.7 0 0 0-1.7-1L15 3.5h-6l-.3 2.6a7.7 7.7 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7.7 7.7 0 0 0 1.7 1l.3 2.6h6l.3-2.6a7.7 7.7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z" },
];

export function Logo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden>
      <rect width="128" height="128" rx="24" fill="#1b2c25" />
      <circle cx="40" cy="64" r="11" fill="#cb9a45" />
      <circle cx="64" cy="64" r="11" fill="#cb9a45" />
      <circle cx="88" cy="64" r="11" fill="none" stroke="#4f9c8c" strokeWidth="4" />
    </svg>
  );
}

function Icon({ d, className = "w-3.5 h-3.5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** A phone-sized picture of a PingPath screen, with the header and bottom menu. */
export function Phone({
  children,
  tab,
  caption,
  bare,
  marks = {},
}: {
  children: React.ReactNode;
  tab?: Tab;
  caption?: string;
  /** Hide the app header and bottom menu (for sheets and full-screen views). */
  bare?: boolean;
  /** Numbered markers on the header parts and bottom menu. */
  marks?: { logo?: number; help?: number; gear?: number; nav?: number };
}) {
  const maybe = (
    n: number | undefined,
    node: React.ReactNode,
    inline = true,
    pos: "corner" | "below" | "left" = "below"
  ) =>
    n ? (
      <Mark n={n} inline={inline} pos={pos}>
        {node}
      </Mark>
    ) : (
      node
    );
  return (
    <figure className="w-[248px] max-w-full mx-auto shrink-0">
      <div className="relative rounded-[30px] border-[5px] border-black/70 bg-bg overflow-hidden shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] ring-1 ring-line">
        <div className="h-4 flex justify-center items-end" aria-hidden>
          <span className="w-14 h-1.5 rounded-full bg-black/70" />
        </div>
        {!bare && (
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-line bg-surface/40">
            {maybe(
              marks.logo,
              <span className="flex items-center gap-1.5 font-display text-[11px] pr-2">
                <Logo size={12} /> PingPath
              </span>
            )}
            <span className={`flex items-center text-muted ${marks.help || marks.gear ? "gap-4" : "gap-2.5"}`}>
              {maybe(
                marks.help,
                <span className="block w-3.5 h-3.5 rounded-full border border-current text-[8px] leading-[12px] text-center font-semibold">
                  ?
                </span>
              )}
              {maybe(marks.gear, <Icon d={NAV[4].d} className="block w-3.5 h-3.5" />)}
            </span>
          </div>
        )}
        <div
          className={`px-3 text-[10.5px] leading-snug space-y-2 min-h-[250px] ${
            marks.logo || marks.help || marks.gear ? "pt-6 pb-3" : "py-3"
          }`}
        >
          {children}
        </div>
        {!bare &&
          maybe(
            marks.nav,
            <div className="flex border-t border-line bg-surface">
              {NAV.map((n) => (
                <span
                  key={n.key}
                  className={`flex-1 flex flex-col items-center gap-0.5 pt-1.5 pb-2.5 text-[7.5px] ${
                    tab === n.key ? "text-accent" : "text-muted"
                  }`}
                >
                  <Icon d={n.d} className="w-3.5 h-3.5" />
                  {n.label}
                </span>
              ))}
            </div>,
            false,
            "left"
          )}
      </div>
      {caption && <figcaption className="text-center text-xs text-muted mt-2.5">{caption}</figcaption>}
    </figure>
  );
}

/** A wide frame for "on a computer" pictures. */
export function Desktop({ children, caption }: { children: React.ReactNode; caption?: string }) {
  return (
    <figure className="w-full max-w-[420px] mx-auto">
      <div className="rounded-xl border border-line bg-bg overflow-hidden ring-1 ring-black/40">
        <div className="flex gap-1 px-2.5 py-1.5 border-b border-line bg-surface-2" aria-hidden>
          <span className="w-2 h-2 rounded-full bg-rust/70" />
          <span className="w-2 h-2 rounded-full bg-accent/70" />
          <span className="w-2 h-2 rounded-full bg-moss/70" />
        </div>
        <div className="flex text-[10.5px] min-h-[170px]">{children}</div>
      </div>
      {caption && <figcaption className="text-center text-xs text-muted mt-2.5">{caption}</figcaption>}
    </figure>
  );
}

export function SidebarSketch({ active }: { active: Tab }) {
  return (
    <div className="w-[110px] shrink-0 border-r border-line bg-surface/40 p-2 space-y-0.5">
      <p className="flex items-center gap-1.5 font-display text-[11px] mb-2 px-1">
        <Logo size={12} /> PingPath
      </p>
      {NAV.map((n) => (
        <p
          key={n.key}
          className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md ${
            active === n.key ? "bg-accent/15 text-accent" : "text-muted"
          }`}
        >
          <Icon d={n.d} className="w-3 h-3" />
          {n.label}
        </p>
      ))}
      <p className="flex items-center gap-1.5 px-1.5 py-1 text-muted pt-3">
        <span className="w-3 h-3 rounded-sm border border-current text-[6px] leading-[10px] text-center">▶</span>
        Tour
      </p>
      <p className="flex items-center gap-1.5 px-1.5 py-1 text-muted">
        <span className="w-3 h-3 rounded-full border border-current text-[7px] leading-[10px] text-center">?</span>
        Guide
      </p>
    </div>
  );
}

/** Numbered gold marker pinned to the top-right of whatever it wraps. */
export function Mark({
  n,
  children,
  inline,
  pos = "corner",
}: {
  n: number;
  children: React.ReactNode;
  inline?: boolean;
  /** corner = top-right; below = centered under small icons; left = top-left inside edges. */
  pos?: "corner" | "below" | "left";
}) {
  const where = {
    corner: "-top-2 -right-1.5",
    below: "top-full mt-1 left-1/2 -translate-x-1/2",
    left: "-top-2.5 left-2",
  }[pos];
  return (
    <span className={`relative ${inline ? "inline-block" : "block"}`}>
      {children}
      <span
        aria-label={`Marker ${n}`}
        className={`absolute ${where} z-10 w-[18px] h-[18px] rounded-full bg-accent text-bg text-[10px] font-semibold flex items-center justify-center ring-2 ring-bg`}
      >
        {n}
      </span>
    </span>
  );
}

/** The key that goes with numbered markers. */
export function Legend({ items }: { items: { title: string; body: React.ReactNode }[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={it.title} className="flex gap-3">
          <span className="w-6 h-6 shrink-0 rounded-full bg-accent text-bg text-xs font-semibold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{it.title}</p>
            <p className="text-sm text-muted">{it.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A left-to-right strip of steps, wrapping on small screens. */
export function Flow({ steps, loop }: { steps: string[]; loop?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface/40 p-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5">
              <span className="text-accent font-semibold mr-1.5 tabular-nums">{i + 1}</span>
              {s}
            </span>
            {i < steps.length - 1 && (
              <span className="text-muted" aria-hidden>
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      {loop && <p className="text-xs text-muted mt-2.5">↻ {loop}</p>}
    </div>
  );
}

/** Small look-alike of an app button. */
export function Btn({
  children,
  kind = "outline",
}: {
  children: React.ReactNode;
  kind?: "accent" | "outline" | "ghost" | "moss" | "danger";
}) {
  const look = {
    accent: "bg-accent text-bg font-medium border-accent",
    outline: "border-line text-ink",
    ghost: "border-transparent text-muted",
    moss: "border-moss/40 bg-moss/10 text-moss",
    danger: "border-rust/40 text-rust",
  }[kind];
  return <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] whitespace-nowrap ${look}`}>{children}</span>;
}

export function MiniInput({ label, value, placeholder }: { label?: string; value?: string; placeholder?: string }) {
  return (
    <span className="block">
      {label && <span className="block text-[9px] text-muted mb-0.5">{label}</span>}
      <span
        className={`block rounded-md border border-line bg-surface-2 px-2 py-1 truncate ${value ? "" : "text-muted/70"}`}
      >
        {value || placeholder || " "}
      </span>
    </span>
  );
}

export function Chip({ children, color, active }: { children: React.ReactNode; color?: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-[1px] text-[9px] whitespace-nowrap ${
        active ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-muted"
      }`}
      style={color ? { color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, background: `color-mix(in srgb, ${color} 14%, transparent)` } : undefined}
    >
      {children}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />;
}

/** One list row inside a phone picture. */
export function Row({
  title,
  sub,
  right,
  lead,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  lead?: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2 py-1.5">
      {lead}
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{title}</span>
        {sub && <span className="block text-[9px] text-muted truncate">{sub}</span>}
      </span>
      {right}
    </span>
  );
}

export function Box({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`block rounded-lg border px-2 py-1 ${
        accent ? "border-accent/40 bg-accent/[0.07]" : "border-line bg-surface/40"
      } divide-y divide-line`}
    >
      {children}
    </span>
  );
}

/** Two-column layout: picture on one side, explanation on the other. */
export function Panel({ visual, children }: { visual: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-10 items-start">
      <div className="min-w-0">{visual}</div>
      <div className="min-w-0 space-y-5">{children}</div>
    </div>
  );
}

export function Tip({ children, tone = "accent" }: { children: React.ReactNode; tone?: "accent" | "rust" | "teal" }) {
  const look = {
    accent: "border-accent/40 bg-accent/[0.07]",
    rust: "border-rust/40 bg-rust/10",
    teal: "border-teal/40 bg-teal/10",
  }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${look}`}>{children}</div>;
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-lg">{children}</h3>;
}
