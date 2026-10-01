/**
 * The muscle vocabulary the body map is drawn from.
 *
 * These are stored on a workout as a plain text array, which is why the map can
 * be generated rather than uploaded: the app knows which regions to light up,
 * and the same data answers "what has this routine neglected this week".
 */

export type BodyView = "front" | "back";

export type Muscle = {
  id: string;
  label: string;
  /** Which silhouette the region is drawn on. Some appear on both. */
  views: BodyView[];
  /** Coarse grouping, used to order the picker. */
  group: "upper" | "core" | "lower";
};

export const MUSCLES: Muscle[] = [
  { id: "chest", label: "Chest", views: ["front"], group: "upper" },
  { id: "shoulders", label: "Shoulders", views: ["front", "back"], group: "upper" },
  { id: "biceps", label: "Biceps", views: ["front"], group: "upper" },
  { id: "triceps", label: "Triceps", views: ["back"], group: "upper" },
  { id: "forearms", label: "Forearms", views: ["front", "back"], group: "upper" },
  { id: "lats", label: "Lats", views: ["back"], group: "upper" },
  { id: "traps", label: "Traps", views: ["back"], group: "upper" },

  { id: "abs", label: "Abs", views: ["front"], group: "core" },
  { id: "obliques", label: "Obliques", views: ["front"], group: "core" },
  { id: "lower_back", label: "Lower back", views: ["back"], group: "core" },

  { id: "glutes", label: "Glutes", views: ["back"], group: "lower" },
  { id: "quads", label: "Quads", views: ["front"], group: "lower" },
  { id: "hamstrings", label: "Hamstrings", views: ["back"], group: "lower" },
  { id: "adductors", label: "Adductors", views: ["front"], group: "lower" },
  { id: "calves", label: "Calves", views: ["front", "back"], group: "lower" },
];

export const MUSCLE_BY_ID = new Map(MUSCLES.map((m) => [m.id, m]));

export const MUSCLE_GROUPS: { id: Muscle["group"]; label: string }[] = [
  { id: "upper", label: "Upper body" },
  { id: "core", label: "Core" },
  { id: "lower", label: "Lower body" },
];

export function muscleLabel(id: string): string {
  return MUSCLE_BY_ID.get(id)?.label ?? id;
}

/** Readable list for a card or a row: "Chest, shoulders and triceps". */
export function muscleSentence(ids: string[]): string {
  const labels = ids.map(muscleLabel);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  // Only the first label keeps its capital; the rest read as a running list.
  const flowing = [labels[0], ...labels.slice(1).map((l) => l.toLowerCase())];
  const rest = flowing.slice(0, -1).join(", ");
  return `${rest} and ${flowing[flowing.length - 1]}`;
}

/** Every muscle a set of workouts touches, in vocabulary order. */
export function coverage(workouts: { muscles: string[] }[]): string[] {
  const hit = new Set<string>();
  workouts.forEach((w) => w.muscles?.forEach((m) => hit.add(m)));
  return MUSCLES.filter((m) => hit.has(m.id)).map((m) => m.id);
}

/** What a routine is not touching, so gaps are visible while building it. */
export function missing(workouts: { muscles: string[] }[]): string[] {
  const hit = new Set(coverage(workouts));
  return MUSCLES.filter((m) => !hit.has(m.id)).map((m) => m.id);
}
