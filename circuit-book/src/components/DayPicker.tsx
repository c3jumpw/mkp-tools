"use client";

import { DAY_FULL, DAY_INITIALS } from "@/lib/format";

/**
 * Seven squares, Sunday first, matching the order the database stores.
 * A routine can sit on any number of days, and a day can hold any number of
 * routines, so these are independent toggles rather than a single choice.
 */
export default function DayPicker({
  selected,
  onChange,
  size = "md",
}: {
  selected: number[];
  onChange: (days: number[]) => void;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-8 w-8 text-xs" : "h-11 flex-1 text-sm";

  function toggle(day: number) {
    onChange(
      selected.includes(day) ? selected.filter((d) => d !== day) : [...selected, day].sort(),
    );
  }

  return (
    <div className="flex gap-1.5" role="group" aria-label="Days this routine runs">
      {DAY_INITIALS.map((initial, day) => {
        const on = selected.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            aria-pressed={on}
            aria-label={DAY_FULL[day]}
            className={`${box} rounded-lg border font-semibold transition-colors ${
              on ? "border-lime bg-lime text-base" : "border-line text-muted active:bg-raise"
            }`}
          >
            {initial}
          </button>
        );
      })}
    </div>
  );
}

/** A compact, read-only version for list rows. */
export function DayStrip({ days }: { days: number[] }) {
  if (days.length === 0) {
    return <span className="text-sm text-faint">Not scheduled</span>;
  }
  return (
    <span className="flex gap-1" aria-label={days.map((d) => DAY_FULL[d]).join(", ")}>
      {DAY_INITIALS.map((initial, day) => (
        <span
          key={day}
          aria-hidden="true"
          className={`grid h-5 w-5 place-items-center rounded text-[0.65rem] font-bold ${
            days.includes(day) ? "bg-lime text-base" : "bg-surface text-faint"
          }`}
        >
          {initial}
        </span>
      ))}
    </span>
  );
}
