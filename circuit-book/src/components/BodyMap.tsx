"use client";

import { MUSCLES, muscleLabel, type BodyView } from "@/lib/muscles";

/**
 * Front and back silhouettes with the worked regions lit up.
 *
 * The map is generated from the muscles tagged on a workout rather than being
 * an uploaded diagram, so every exercise looks consistent, nothing has to be
 * sourced by hand, and the same data can answer what a routine misses.
 *
 * Shapes are deliberately simplified — this needs to read at 90px on a phone
 * in a gym, not satisfy an anatomist.
 */

type RegionShape = { d: string; view: BodyView };

// viewBox is 100 x 210 per figure.
const REGIONS: Record<string, RegionShape[]> = {
  chest: [
    { view: "front", d: "M35 44 q15 -5 15 0 v14 q-8 5 -16 1 q-3 -8 1 -15 z" },
    { view: "front", d: "M65 44 q-15 -5 -15 0 v14 q8 5 16 1 q3 -8 -1 -15 z" },
  ],
  shoulders: [
    { view: "front", d: "M33 41 q-10 1 -11 11 q-1 6 2 9 q6 -4 8 -11 q1 -6 1 -9 z" },
    { view: "front", d: "M67 41 q10 1 11 11 q1 6 -2 9 q-6 -4 -8 -11 q-1 -6 -1 -9 z" },
    { view: "back", d: "M33 41 q-10 1 -11 11 q-1 6 2 9 q6 -4 8 -11 q1 -6 1 -9 z" },
    { view: "back", d: "M67 41 q10 1 11 11 q1 6 -2 9 q-6 -4 -8 -11 q-1 -6 -1 -9 z" },
  ],
  biceps: [
    { view: "front", d: "M22 54 q-5 2 -5 10 l1 14 q5 2 8 -1 l1 -16 q0 -6 -5 -7 z" },
    { view: "front", d: "M78 54 q5 2 5 10 l-1 14 q-5 2 -8 -1 l-1 -16 q0 -6 5 -7 z" },
  ],
  triceps: [
    { view: "back", d: "M22 54 q-5 2 -5 10 l1 14 q5 2 8 -1 l1 -16 q0 -6 -5 -7 z" },
    { view: "back", d: "M78 54 q5 2 5 10 l-1 14 q-5 2 -8 -1 l-1 -16 q0 -6 5 -7 z" },
  ],
  forearms: [
    { view: "front", d: "M18 80 q-4 8 -3 18 l3 10 q4 1 6 -1 l2 -12 q1 -10 -2 -16 z" },
    { view: "front", d: "M82 80 q4 8 3 18 l-3 10 q-4 1 -6 -1 l-2 -12 q-1 -10 2 -16 z" },
    { view: "back", d: "M18 80 q-4 8 -3 18 l3 10 q4 1 6 -1 l2 -12 q1 -10 -2 -16 z" },
    { view: "back", d: "M82 80 q4 8 3 18 l-3 10 q-4 1 -6 -1 l-2 -12 q-1 -10 2 -16 z" },
  ],
  abs: [
    { view: "front", d: "M42 62 q8 -2 16 0 v26 q-8 4 -16 0 z" },
  ],
  obliques: [
    { view: "front", d: "M34 62 q6 -1 7 2 v26 q-5 2 -8 -2 q-2 -13 1 -26 z" },
    { view: "front", d: "M66 62 q-6 -1 -7 2 v26 q5 2 8 -2 q2 -13 -1 -26 z" },
  ],
  traps: [
    { view: "back", d: "M38 36 q12 -4 24 0 q2 10 -3 16 q-9 3 -18 0 q-5 -6 -3 -16 z" },
  ],
  lats: [
    { view: "back", d: "M34 54 q8 -2 12 2 l-1 24 q-9 3 -14 -4 q-2 -12 3 -22 z" },
    { view: "back", d: "M66 54 q-8 -2 -12 2 l1 24 q9 3 14 -4 q2 -12 -3 -22 z" },
  ],
  lower_back: [
    { view: "back", d: "M41 80 h18 v14 q-9 4 -18 0 z" },
  ],
  glutes: [
    { view: "back", d: "M39 96 q11 -4 22 0 q2 12 -4 17 q-14 3 -18 -3 q-2 -7 0 -14 z" },
  ],
  quads: [
    { view: "front", d: "M40 112 q7 -2 9 2 l-1 28 q-7 3 -11 -2 q-2 -15 3 -28 z" },
    { view: "front", d: "M60 112 q-7 -2 -9 2 l1 28 q7 3 11 -2 q2 -15 -3 -28 z" },
  ],
  adductors: [
    { view: "front", d: "M47 112 q3 -1 6 0 v20 q-3 2 -6 0 z" },
  ],
  hamstrings: [
    { view: "back", d: "M40 116 q7 -2 9 2 l-1 24 q-7 3 -11 -2 q-2 -13 3 -24 z" },
    { view: "back", d: "M60 116 q-7 -2 -9 2 l1 24 q7 3 11 -2 q2 -13 -3 -24 z" },
  ],
  calves: [
    { view: "front", d: "M41 142 q6 -2 8 1 l-1 24 q-6 3 -9 -1 q-2 -13 2 -24 z" },
    { view: "front", d: "M59 142 q-6 -2 -8 1 l1 24 q6 3 9 -1 q2 -13 -2 -24 z" },
    { view: "back", d: "M41 146 q6 -2 8 1 l-1 24 q-6 3 -9 -1 q-2 -13 2 -24 z" },
    { view: "back", d: "M59 146 q-6 -2 -8 1 l1 24 q6 3 9 -1 q2 -13 -2 -24 z" },
  ],
};

/** The body outline the regions sit on. */
function Silhouette({ view }: { view: BodyView }) {
  return (
    <g fill="var(--color-raise)" stroke="var(--color-line)" strokeWidth="1">
      {/* head */}
      <ellipse cx="50" cy="18" rx="11" ry="13" />
      {/* neck */}
      <rect x="45" y="29" width="10" height="7" rx="2" />
      {/* torso */}
      <path d="M33 40 q17 -7 34 0 q4 16 1 30 q-2 14 -5 26 q-15 5 -30 0 q-3 -12 -5 -26 q-3 -14 1 -30 z" />
      {/* arms */}
      <path d="M33 42 q-12 2 -14 14 l-4 30 q-1 12 1 24 q4 2 7 0 l3 -24 l5 -22 z" />
      <path d="M67 42 q12 2 14 14 l4 30 q1 12 -1 24 q-4 2 -7 0 l-3 -24 l-5 -22 z" />
      {/* hips */}
      <path d="M37 94 q13 -5 26 0 q2 10 0 16 q-13 4 -26 0 q-2 -6 0 -16 z" />
      {/* legs */}
      <path d="M38 108 q6 -3 11 0 l1 32 l-1 34 q-5 3 -9 0 l-3 -34 z" />
      <path d="M62 108 q-6 -3 -11 0 l-1 32 l1 34 q5 3 9 0 l3 -34 z" />
      {/* feet */}
      <path d="M39 174 q5 -2 9 0 l1 7 q-6 2 -11 0 z" />
      <path d="M61 174 q-5 -2 -9 0 l-1 7 q6 2 11 0 z" />
      {view === "back" && (
        // A seam down the back so the two figures are tellable apart at a glance.
        <path d="M50 38 v58" stroke="var(--color-line)" strokeWidth="0.8" fill="none" />
      )}
    </g>
  );
}

function Figure({
  view,
  active,
  onToggle,
}: {
  view: BodyView;
  active: Set<string>;
  onToggle?: (muscle: string) => void;
}) {
  const interactive = Boolean(onToggle);

  return (
    <svg
      viewBox="0 0 100 190"
      className="h-full w-full"
      role={interactive ? "group" : "img"}
      aria-label={interactive ? `${view} view` : undefined}
    >
      <Silhouette view={view} />

      {MUSCLES.map((muscle) => {
        const shapes = (REGIONS[muscle.id] ?? []).filter((s) => s.view === view);
        if (shapes.length === 0) return null;
        const on = active.has(muscle.id);

        const paths = shapes.map((shape, i) => (
          <path
            key={i}
            d={shape.d}
            fill={on ? "var(--color-lime)" : "var(--color-line)"}
            opacity={on ? 1 : 0.55}
          />
        ));

        if (!interactive) return <g key={muscle.id}>{paths}</g>;

        return (
          <g
            key={muscle.id}
            role="checkbox"
            aria-checked={on}
            aria-label={muscleLabel(muscle.id)}
            tabIndex={0}
            onClick={() => onToggle?.(muscle.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle?.(muscle.id);
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>path]:stroke-lime [&:focus-visible>path]:stroke-[1.5]"
          >
            {paths}
          </g>
        );
      })}
    </svg>
  );
}

export default function BodyMap({
  muscles,
  onToggle,
  className = "",
  showLabels = true,
}: {
  muscles: string[];
  onToggle?: (muscle: string) => void;
  className?: string;
  showLabels?: boolean;
}) {
  const active = new Set(muscles);

  return (
    <div className={`flex gap-2 ${className}`}>
      {(["front", "back"] as BodyView[]).map((view) => (
        <div key={view} className="flex min-w-0 flex-1 flex-col items-center">
          <div className="aspect-[100/190] w-full">
            <Figure view={view} active={active} onToggle={onToggle} />
          </div>
          {showLabels && (
            <span className="mt-1 text-[0.65rem] font-medium text-faint">
              {view === "front" ? "Front" : "Back"}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
