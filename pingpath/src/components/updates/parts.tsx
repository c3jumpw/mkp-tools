import { KIND_LABEL, type Audience, type ChangeKind } from "@/lib/changelog";

const AREA_ICON: Record<string, string> = {
  Home: "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1v-8.5Z",
  Contacts: "M12 4.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4ZM5 20c0-3.8 3.1-6.5 7-6.5s7 2.7 7 6.5",
  Tags: "M11 4h6a2 2 0 0 1 2 2v6l-8.5 8.5a1.5 1.5 0 0 1-2.1 0l-5.9-5.9a1.5 1.5 0 0 1 0-2.1L11 4ZM15.5 8.5h.01",
  Blasts:
    "M6 9.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm6 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Zm6 0a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4Z",
  "Blast Deck": "M7 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2ZM8 5h8",
  Settings: "M4 7h9M17 7h3M4 17h4M12 17h8M15 5v4M10 15v4",
  Help: "M12 3.5v4M12 16.5v4M3.5 12h4M16.5 12h4M6 6l2.8 2.8M15.2 15.2 18 18M6 18l2.8-2.8M15.2 8.8 18 6",
  Accounts: "M6.5 11h11v9h-11zM9 11V8a3 3 0 0 1 6 0v3",
  Setup: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5Z",
  Admin: "M12 3.5 5.5 6.2v4.9c0 4.1 2.8 7.7 6.5 8.9 3.7-1.2 6.5-4.8 6.5-8.9V6.2L12 3.5ZM9.3 12l1.9 1.9 3.6-3.8",
  App: "M8.5 3.5h7a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1ZM11 17.5h2",
};

const KIND_TINT: Record<ChangeKind, string> = {
  new: "bg-accent/15 text-accent border-accent/30",
  improved: "bg-teal/15 text-teal border-teal/30",
  fixed: "bg-moss/15 text-moss border-moss/30",
  "behind-the-scenes": "bg-surface-2 text-muted border-line",
};

/** A tinted tile with the area's icon; the tint says what kind of change it is. */
export function ChangeIcon({ area, kind, small }: { area: string; kind: ChangeKind; small?: boolean }) {
  return (
    <span
      className={`shrink-0 flex items-center justify-center border ${KIND_TINT[kind]} ${
        small ? "w-8 h-8 rounded-lg" : "w-10 h-10 rounded-xl"
      }`}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={small ? "w-4 h-4" : "w-5 h-5"}
      >
        <path d={AREA_ICON[area] || AREA_ICON.App} />
      </svg>
    </span>
  );
}

export function KindChip({ kind }: { kind: ChangeKind }) {
  return (
    <span className={`shrink-0 whitespace-nowrap inline-flex items-center rounded-full border px-2 py-[1px] text-[11px] font-medium ${KIND_TINT[kind]}`}>
      {KIND_LABEL[kind]}
    </span>
  );
}

export function AudienceChip({ audience }: { audience: Audience }) {
  return audience === "admin" ? (
    <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-full border border-teal/40 bg-teal/10 px-2 py-[1px] text-[11px] text-teal">
      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M6.5 11h11v9h-11zM9 11V8a3 3 0 0 1 6 0v3" />
      </svg>
      Admin only
    </span>
  ) : (
    <span className="shrink-0 whitespace-nowrap inline-flex items-center rounded-full border border-line px-2 py-[1px] text-[11px] text-muted">Everyone</span>
  );
}

/** PingPath's three dots with a couple of sparkles. */
export function Burst() {
  return (
    <span className="relative inline-flex w-14 h-14 rounded-2xl border border-line bg-surface-2/80 items-center justify-center" aria-hidden>
      <svg viewBox="0 0 56 56" className="w-14 h-14">
        <circle cx="17" cy="31" r="5.2" fill="var(--accent)" />
        <circle cx="28" cy="31" r="5.2" fill="var(--accent)" />
        <circle cx="39" cy="31" r="5.2" fill="none" stroke="var(--teal)" strokeWidth="2" />
        <path d="M44 9.5v7M40.5 13h7" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13 12v4.4M10.8 14.2h4.4" stroke="var(--teal)" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="47" cy="44" r="1.4" fill="var(--accent)" opacity="0.7" />
      </svg>
    </span>
  );
}
