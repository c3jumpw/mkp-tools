"use client";

import Link from "next/link";
import type { SessionBlockWithItems, SessionItem } from "@/lib/database.types";
import { formatTarget } from "@/lib/format";
import { muscleSentence } from "@/lib/muscles";
import BodyMap from "@/components/BodyMap";
import PhotoSequence from "@/components/PhotoSequence";
import Thumb from "@/components/Thumb";

export type SetKey = string;
export const setKey = (itemId: string, round: number): SetKey => `${itemId}:${round}`;

const MODE_LABEL: Record<string, string> = {
  straight: "Straight sets",
  superset: "Superset",
  circuit: "Circuit",
};

/**
 * One block, drawn as an exercise-by-round grid.
 *
 * A straight set is a block with one exercise, so it collapses to a single row
 * of dots with room for the photo. A superset has two rows and a circuit has
 * three or more, where the rows are what you alternate between. One layout
 * covers all three rather than a separate screen per mode.
 */
export default function BlockCard({
  block,
  number,
  total,
  done,
  onToggleSet,
}: {
  block: SessionBlockWithItems;
  number: number;
  total: number;
  done: Set<SetKey>;
  onToggleSet: (item: SessionItem, round: number) => void;
}) {
  const single = block.items.length === 1;
  const rounds = Array.from({ length: block.rounds }, (_, i) => i + 1);
  const muscles = Array.from(new Set(block.items.flatMap((i) => i.muscles ?? [])));

  // The round everyone is working on: the first with any set still open.
  const activeRound =
    rounds.find((r) => block.items.some((i) => !done.has(setKey(i.id, r)))) ?? block.rounds;

  return (
    <section
      className="snap-item flex h-full w-full shrink-0 flex-col overflow-y-auto"
      aria-label={`Block ${number} of ${total}`}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-4 pb-5">
        {/* Heading ---------------------------------------------------- */}
        <div className="flex items-start gap-3.5">
          <span
            className="ex-tight tnum text-[3.25rem] leading-[0.8] font-bold text-muted"
            aria-hidden="true"
          >
            {String(number).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            {single ? (
              <h2 className="ex-tight text-[1.65rem] leading-[1.05] font-bold">
                {block.items[0].workout_name}
              </h2>
            ) : (
              <h2 className="ex-tight text-[1.4rem] leading-[1.05] font-bold">
                {MODE_LABEL[block.mode] ?? "Block"}
              </h2>
            )}
            <p className="tnum mt-1.5 text-sm text-muted">
              {single ? "Set" : "Round"} {activeRound} of {block.rounds}
              {!single && `, ${block.items.length} exercises`}
            </p>
          </div>
        </div>

        {/* A single exercise gets the photo; a superset gives that space to
            the rows, since one photo could not stand for both. */}
        {single && block.items[0].image_paths?.length > 0 && (
          <div className="mt-5">
            <PhotoSequence
              paths={block.items[0].image_paths}
              alt={block.items[0].workout_name}
            />
          </div>
        )}

        {single && (
          <>
            {(() => {
              const t = formatTarget({
                sets: block.rounds,
                reps: block.items[0].target_reps,
                durationSeconds: block.items[0].target_duration_seconds,
              });
              return t ? (
                <p className="ex-tight tnum mt-6 text-[2.75rem] leading-none font-bold">{t}</p>
              ) : null;
            })()}
          </>
        )}

        {/* The grid --------------------------------------------------- */}
        <div className={single ? "mt-5" : "mt-6"}>
          {block.items.map((item, row) => {
            const target = formatTarget({
              sets: null,
              reps: item.target_reps,
              durationSeconds: item.target_duration_seconds,
            });

            return (
              <div
                key={item.id}
                className={`py-3 ${row > 0 ? "border-t border-line-soft" : ""}`}
              >
                {!single && (
                  <div className="mb-2.5 flex items-center gap-3">
                    <span
                      className="ex grid h-6 w-6 shrink-0 place-items-center rounded bg-raise text-xs font-bold text-muted"
                      aria-hidden="true"
                    >
                      {String.fromCharCode(65 + row)}
                    </span>
                    {item.image_path && (
                      <Thumb path={item.image_path} alt="" className="h-10 w-10 shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="ex block truncate font-semibold">{item.workout_name}</span>
                      {target && <span className="tnum text-sm text-muted">{target}</span>}
                    </span>
                  </div>
                )}

                {/* One dot per round. Tappable individually for when a round
                    goes out of order. */}
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={`Sets for ${item.workout_name}`}
                >
                  {rounds.map((round) => {
                    const on = done.has(setKey(item.id, round));
                    return (
                      <button
                        key={round}
                        type="button"
                        onClick={() => onToggleSet(item, round)}
                        aria-pressed={on}
                        aria-label={`${item.workout_name}, set ${round}${on ? ", done" : ""}`}
                        className={`tnum grid h-11 min-w-11 flex-1 place-items-center rounded-lg border text-sm font-bold transition-colors ${
                          on
                            ? "border-lime bg-lime text-base"
                            : round === activeRound
                              ? "border-chalk text-chalk"
                              : "border-line text-faint"
                        }`}
                      >
                        {on ? <CheckIcon size={16} /> : round}
                      </button>
                    );
                  })}
                </div>

                {item.description && (
                  <p className="mt-2.5 max-w-[46ch] text-sm leading-relaxed text-muted">
                    {item.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Target area ------------------------------------------------- */}
        {(muscles.length > 0 || block.items.some((i) => i.target_area)) && (
          <div className="mt-6 border-t border-line-soft pt-4">
            <div className="flex items-start gap-4">
              {muscles.length > 0 && (
                <div className="w-24 shrink-0">
                  <BodyMap muscles={muscles} showLabels={false} />
                </div>
              )}
              <div className="min-w-0 flex-1 pt-1">
                <span className="block text-sm font-medium text-muted">Works</span>
                {muscles.length > 0 && (
                  <p className="mt-1 text-sm leading-relaxed text-chalk">
                    {muscleSentence(muscles)}
                  </p>
                )}
                {block.items
                  .filter((i) => i.target_area)
                  .map((i) => (
                    <p key={i.id} className="mt-1 text-sm leading-relaxed text-muted">
                      {i.target_area}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1" />

        <Link
          href="/library"
          className="mt-6 self-start text-sm text-muted underline underline-offset-4"
        >
          Edit in library
        </Link>
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
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
