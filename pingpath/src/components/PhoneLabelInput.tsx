"use client";

import { useState } from "react";
import { PHONE_LABEL_SUGGESTIONS } from "@/lib/types";

/**
 * Free-text label for a second phone number ("Work", "Mom's cell"…), with
 * one-tap suggestions. Works controlled (value/onChange) or inside a plain
 * form via `name`.
 */
export default function PhoneLabelInput({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  inputClassName,
}: {
  id: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  inputClassName: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const current = value ?? own;

  function set(v: string) {
    setOwn(v);
    onChange?.(v);
  }

  return (
    <div>
      <input
        id={id}
        name={name}
        value={current}
        onChange={(e) => set(e.target.value)}
        maxLength={30}
        placeholder="Label, e.g. Work"
        autoComplete="off"
        className={inputClassName}
      />
      <div className="flex flex-wrap gap-1 mt-1.5">
        {PHONE_LABEL_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => set(current === s ? "" : s)}
            // Overrides the global 44px touch minimum: these sit in a compact row.
            style={{ minHeight: 30 }}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
              current === s ? "border-accent/60 bg-accent/15 text-accent" : "border-line text-muted hover:text-ink"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
