"use client";

import Link from "next/link";
import type { SessionItem } from "@/lib/database.types";
import { formatTarget } from "@/lib/format";
import Thumb from "@/components/Thumb";

/**
 * One station placard. This is the screen the app is really for: it gets read
 * at arm's length by someone out of breath, so the station number and the
 * target carry the hierarchy and everything else stays quiet.
 */
export default function StationCard({
  item,
  number,
  total,
}: {
  item: SessionItem;
  number: number;
  total: number;
}) {
  const target = formatTarget({
    sets: item.target_sets,
    reps: item.target_reps,
    durationSeconds: item.target_duration_seconds,
  });

  return (
    <section
      className="snap-item flex h-full w-full shrink-0 flex-col overflow-y-auto"
      aria-label={`Station ${number} of ${total}: ${item.workout_name}`}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-4 pb-5">
        {/* The number is wayfinding in a circuit, not decoration — it says
            where you are on the floor. */}
        <div className="flex items-start gap-3.5">
          <span
            className={`ex-tight tnum text-[3.25rem] leading-[0.8] font-bold ${
              item.completed_at ? "text-lime" : "text-muted"
            }`}
            aria-hidden="true"
          >
            {String(number).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="ex-tight text-[1.65rem] leading-[1.05] font-bold">
              {item.workout_name}
            </h2>
            {(item.category || item.swapped_from) && (
              <p className="mt-1.5 flex flex-wrap items-center gap-2">
                {item.category && (
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">
                    {item.category}
                  </span>
                )}
                {item.swapped_from && (
                  <span className="text-xs text-faint">swapped from {item.swapped_from}</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Only workouts that actually carry a photo get the space for one —
            an empty frame would push the target off a small screen. */}
        {item.image_path && (
          <div className="mt-5">
            <Thumb
              path={item.image_path}
              alt={item.workout_name}
              className="aspect-[4/3] w-full"
              rounded="rounded-xl"
            />
          </div>
        )}

        {target && (
          <p
            className={`ex-tight tnum text-[2.75rem] leading-none font-bold ${
              item.image_path ? "mt-6" : "mt-8"
            }`}
          >
            {target}
          </p>
        )}

        {item.description && (
          <p className="mt-4 max-w-[46ch] text-[0.975rem] leading-relaxed text-muted">
            {item.description}
          </p>
        )}

        {item.completed_at && (
          <p className="mt-5 inline-flex items-center gap-1.5 self-start rounded-full bg-lime px-3 py-1 text-sm font-semibold text-base">
            <CheckIcon size={14} />
            Done
          </p>
        )}

        <div className="flex-1" />

        {item.workout_id && (
          <Link
            href="/library"
            className="mt-6 self-start text-sm text-muted underline underline-offset-4"
          >
            Edit in library
          </Link>
        )}
      </div>
    </section>
  );
}

export function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
