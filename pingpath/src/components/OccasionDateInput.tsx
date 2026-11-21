"use client";

import { MONTH_NAMES, type SimpleDate } from "@/lib/occasions";

/**
 * Month + day, with the year optional — people often know a birthday
 * without knowing the year. Emits null until both month and day are set.
 */
export default function OccasionDateInput({
  value,
  onChange,
  idPrefix,
  size = "md",
}: {
  value: SimpleDate | null;
  onChange: (v: SimpleDate | null) => void;
  idPrefix: string;
  size?: "md" | "sm";
}) {
  const month = value?.month ?? 0;
  const day = value?.day ?? 0;
  const year = value?.year ?? null;
  // Feb allows 29 so leap-day birthdays can be entered.
  const maxDay = month ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] : 31;

  function emit(next: { month: number; day: number; year: number | null }) {
    onChange(next.month || next.day || next.year ? next : null);
  }

  const field =
    "rounded-lg bg-surface-2 border border-line px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 min-w-0 " +
    (size === "sm" ? "py-1.5" : "py-2");

  return (
    <div className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-2">
      <select
        id={`${idPrefix}-month`}
        aria-label="Month"
        value={month}
        onChange={(e) => emit({ month: Number(e.target.value), day: Math.min(day, 31), year })}
        className={field}
      >
        <option value={0}>Month</option>
        {MONTH_NAMES.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        id={`${idPrefix}-day`}
        aria-label="Day"
        value={day > maxDay ? 0 : day}
        onChange={(e) => emit({ month, day: Number(e.target.value), year })}
        className={field}
      >
        <option value={0}>Day</option>
        {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <input
        id={`${idPrefix}-year`}
        aria-label="Year (optional)"
        inputMode="numeric"
        placeholder="Year"
        value={year ?? ""}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
          const y = digits.length === 4 ? Number(digits) : null;
          emit({ month, day, year: digits ? (y ?? Number(digits)) : null });
        }}
        className={field}
      />
    </div>
  );
}

/** True when a SimpleDate is complete enough to save (month + day, sensible year). */
export function isCompleteDate(v: SimpleDate | null): v is SimpleDate {
  if (!v || !v.month || !v.day) return false;
  if (v.year != null && (v.year < 1900 || v.year > new Date().getFullYear() + 1)) return false;
  return true;
}
