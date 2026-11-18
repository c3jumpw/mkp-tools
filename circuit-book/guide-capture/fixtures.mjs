/**
 * Demo data for the guide screenshots. Shaped exactly like the rows the app's
 * Supabase queries return, so the real pages render it unchanged.
 */

export const USER = {
  id: "6b6e3c1a-0000-4000-8000-0000000000aa",
  email: "demo@circuitbook.app",
};

const T0 = "2026-10-01T12:00:00Z";

const W = (id, name, o) => ({
  id, user_id: USER.id, name,
  description: null, category: null, target_sets: null, target_reps: null,
  target_duration_seconds: null, image_path: null, muscles: [], target_area: null,
  created_at: T0, updated_at: T0, ...o,
});

export const WORKOUTS = [
  W("w-squat", "Goblet Squat", {
    category: "Strength", target_sets: 4, target_reps: "12", muscles: ["quads", "glutes"],
    description: "Keep the bell tight to the chest. Elbows inside the knees at the bottom.",
    target_area: "Front of the thigh and the seat, through a full-depth squat.",
    image_path: "demo/goblet-1.svg",
  }),
  W("w-bench", "Bench Press", {
    category: "Strength", target_sets: 4, target_reps: "8", muscles: ["chest", "triceps", "shoulders"],
    description: "Bar to the chest, full lockout. 185 lb working weight.",
    image_path: "demo/bench-1.svg",
  }),
  W("w-mountain", "Mountain Climbers", {
    category: "Cardio", target_sets: 3, target_duration_seconds: 30, muscles: ["abs", "obliques"],
    description: "Quick feet, hips low and level.", image_path: "demo/mountain-1.svg",
  }),
  W("w-plank", "Plank Hold", {
    category: "Core", target_sets: 3, target_duration_seconds: 45, muscles: ["abs", "lower_back"],
    target_area: "Deep core, held still under tension.", image_path: "demo/plank-1.svg",
  }),
  W("w-boxjump", "Box Jumps", {
    category: "Plyo", target_sets: 4, target_reps: "10", muscles: ["quads", "glutes", "calves"],
    description: "Step down, never jump down.", image_path: "demo/boxjump-1.svg",
  }),
  W("w-shuffle", "Lateral Shuffles", {
    category: "Soccer", target_sets: 3, target_duration_seconds: 30, muscles: ["adductors", "calves"],
    image_path: "demo/shuffle-1.svg",
  }),
];
export const WBY = Object.fromEntries(WORKOUTS.map((w) => [w.id, w]));

export const IMAGES = [
  ["w-squat", ["demo/goblet-1.svg", "demo/goblet-2.svg", "demo/goblet-3.svg"]],
  ["w-bench", ["demo/bench-1.svg"]],
  ["w-mountain", ["demo/mountain-1.svg"]],
  ["w-plank", ["demo/plank-1.svg"]],
  ["w-boxjump", ["demo/boxjump-1.svg"]],
  ["w-shuffle", ["demo/shuffle-1.svg"]],
].flatMap(([wid, paths]) =>
  paths.map((path, position) => ({
    id: `img-${wid}-${position}`, user_id: USER.id, workout_id: wid, path, caption: null, position, created_at: T0,
  })),
);
export const sequenceFor = (wid) => IMAGES.filter((i) => i.workout_id === wid).map((i) => i.path);

/* --- Routines ------------------------------------------------------------ */

const ROUTINE_DEFS = [
  { id: "r-leg", name: "Leg Day", days: [1, 3, 5], blocks: [
    { id: "b1", mode: "straight", rounds: 4, items: ["w-squat"] },
    { id: "b2", mode: "superset", rounds: 3, items: ["w-bench", "w-mountain"] },
    { id: "b3", mode: "circuit", rounds: 3, items: ["w-boxjump", "w-plank", "w-shuffle"] },
  ] },
  { id: "r-push", name: "Upper Push", days: [2, 4], blocks: [
    { id: "b4", mode: "straight", rounds: 4, items: ["w-bench"] },
    { id: "b5", mode: "superset", rounds: 3, items: ["w-mountain", "w-plank"] },
  ] },
  { id: "r-cond", name: "Conditioning", days: [], blocks: [
    { id: "b6", mode: "circuit", rounds: 4, items: ["w-boxjump", "w-mountain", "w-shuffle"] },
  ] },
];

export const ROUTINE_IDS = ROUTINE_DEFS.map((r) => r.id);

export function routineBlocks(rid) {
  const r = ROUTINE_DEFS.find((x) => x.id === rid);
  if (!r) return [];
  return r.blocks.map((b, position) => ({
    id: b.id, user_id: USER.id, routine_id: rid, position, mode: b.mode, rounds: b.rounds,
    rest_seconds: null, label: null, created_at: T0,
  }));
}

export function routineItems(rid) {
  const r = ROUTINE_DEFS.find((x) => x.id === rid);
  if (!r) return [];
  return r.blocks.flatMap((b) =>
    b.items.map((wid, position) => ({
      id: `${b.id}-i${position}`, user_id: USER.id, routine_id: rid, block_id: b.id, workout_id: wid,
      position, sets_override: null, reps_override: null, notes: null, created_at: T0, workout: WBY[wid],
    })),
  );
}

export function routineDays(rid) {
  const r = ROUTINE_DEFS.find((x) => x.id === rid);
  if (!r) return [];
  return r.days.map((d) => ({ id: `${rid}-d${d}`, user_id: USER.id, routine_id: rid, day_of_week: d }));
}

export function routineRow(rid) {
  const r = ROUTINE_DEFS.find((x) => x.id === rid);
  const items = routineItems(rid);
  return {
    id: r.id, user_id: USER.id, name: r.name, description: null, accent: null, created_at: T0, updated_at: T0,
    cb_routine_days: routineDays(rid),
    cb_routine_blocks: routineBlocks(rid).map((b) => ({
      ...b, cb_routine_items: items.filter((i) => i.block_id === b.id),
    })),
  };
}

/* --- Sessions ------------------------------------------------------------ */

function buildSession(sid, rid, started_at, completed_at) {
  const r = ROUTINE_DEFS.find((x) => x.id === rid);
  const blocks = r.blocks.map((b, position) => ({
    id: `${sid}-${b.id}`, user_id: USER.id, session_id: sid, position, mode: b.mode, rounds: b.rounds,
    rest_seconds: null, label: null,
  }));
  const items = r.blocks.flatMap((b) =>
    b.items.map((wid, position) => {
      const w = WBY[wid];
      return {
        id: `${sid}-${b.id}-i${position}`, user_id: USER.id, session_id: sid, workout_id: wid,
        workout_name: w.name, description: w.description, category: w.category,
        target_sets: w.target_sets, target_reps: w.target_reps, target_duration_seconds: w.target_duration_seconds,
        image_path: w.image_path, image_paths: sequenceFor(wid), muscles: w.muscles, target_area: w.target_area,
        block_id: `${sid}-${b.id}`, position, completed_at: null, swapped_from: null,
      };
    }),
  );
  // Every (item, round) in the order a session works through them.
  const order = r.blocks.flatMap((b) =>
    Array.from({ length: b.rounds }, (_, k) => k + 1).flatMap((round) =>
      b.items.map((_, position) => [`${sid}-${b.id}-i${position}`, round]),
    ),
  );
  return { id: sid, user_id: USER.id, routine_id: rid, routine_name: r.name, started_at, completed_at, notes: null, blocks, items, order };
}

export const SESSIONS = {
  live: buildSession("s-live", "r-leg", "2026-10-30T21:05:00Z", null),
  push: buildSession("s-push", "r-push", "2026-10-29T22:10:00Z", null),
  leg28: buildSession("h-leg28", "r-leg", "2026-10-28T21:00:00Z", "2026-10-28T21:41:00Z"),
  push27: buildSession("h-push27", "r-push", "2026-10-27T22:00:00Z", "2026-10-27T22:31:00Z"),
  leg26: buildSession("h-leg26", "r-leg", "2026-10-26T21:00:00Z", "2026-10-26T21:38:00Z"),
  cond24: buildSession("h-cond24", "r-cond", "2026-10-24T14:00:00Z", "2026-10-24T14:22:00Z"),
};

export const firstN = (s, n) => s.order.slice(0, n);

export function setsFor(s, keys) {
  return keys.map(([itemId, round], i) => ({
    id: `${s.id}-set${i}`, user_id: USER.id, session_id: s.id, session_item_id: itemId, round_number: round,
    completed_at: s.started_at,
  }));
}
