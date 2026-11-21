/**
 * The live sample screens the tour shows. Each one renders the real app
 * component with sample data at /<section>/tour/<name>, so what the tour shows
 * is always the current version of that screen.
 */
export const SCREEN_IDS = [
  "home/main",
  "home/wish",
  "home/month",
  "home/quickadd",
  "home/whatsnew",
  "contacts/list",
  "contacts/bulk",
  "contacts/add",
  "contacts/detail",
  "contacts/import",
  "contacts/duplicates",
  "tags/list",
  "tags/detail",
  "tags/edit",
  "blasts/list",
  "blasts/detail",
  "blasts/edit-step",
  "blasts/roster",
  "blasts/add",
  "deck/setup",
  "deck/running",
  "settings/menu",
  "settings/calendar",
  "settings/changelog",
  "signup/form",
] as const;

export type ScreenId = (typeof SCREEN_IDS)[number];

export function isScreen(id: string): id is ScreenId {
  return (SCREEN_IDS as readonly string[]).includes(id);
}

export function screenUrl(id: ScreenId): string {
  const [section, name] = id.split("/");
  return `/${section}/tour/${name}`;
}

/** The width and height the screens are drawn at (an iPhone-sized window). */
export const SCREEN_W = 390;
export const SCREEN_H = 780;
