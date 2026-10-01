"use client";

import { MUSCLES, MUSCLE_GROUPS } from "@/lib/muscles";
import BodyMap from "@/components/BodyMap";
import { Chip } from "@/components/ui";

/**
 * Pick the muscles a workout targets, either by tapping the figure or the
 * chips. Both drive the same selection — the figure is quicker once you know
 * the shape, the chips are unambiguous.
 */
export default function MusclePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (muscles: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id],
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-[260px]">
        <BodyMap muscles={selected} onToggle={toggle} />
      </div>

      <div className="mt-4 space-y-3">
        {MUSCLE_GROUPS.map((group) => (
          <div key={group.id}>
            <span className="mb-1.5 block text-xs font-medium text-faint">{group.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.filter((m) => m.group === group.id).map((muscle) => (
                <Chip
                  key={muscle.id}
                  active={selected.includes(muscle.id)}
                  onClick={() => toggle(muscle.id)}
                >
                  {muscle.label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-3 text-sm text-muted underline underline-offset-4"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
