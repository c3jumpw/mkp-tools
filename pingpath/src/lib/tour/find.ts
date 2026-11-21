/**
 * Finds an element on a tour screen. Used inside the screen (to open sheets
 * before it is shown) and by the tour itself (to place the numbered callouts),
 * so a callout follows the real element wherever the app moves it.
 */
export type Target = {
  /** CSS selector to start from. Defaults to every element. */
  sel?: string;
  /** Visible text the element must contain. The innermost match wins. */
  text?: string;
  /** Text must match exactly instead of being contained. */
  exact?: boolean;
  /** Widen the match to its nearest ancestor matching this selector. */
  up?: string;
  /** Which match to use when several are found (0 = first). */
  nth?: number;
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

function shown(el: Element) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

export function findAll(root: ParentNode, t: Target): HTMLElement[] {
  let list = Array.from(root.querySelectorAll<HTMLElement>(t.sel || "*"));
  if (t.text) {
    const want = norm(t.text);
    list = list.filter((el) => {
      const have = norm(el.textContent || "");
      return t.exact ? have === want : have.includes(want);
    });
    list = list.filter((el) => !list.some((o) => o !== el && el.contains(o)));
  }
  if (t.up) {
    const widened = list.map((el) => (el.closest(t.up!) as HTMLElement | null) || el);
    list = widened.filter((el, i) => widened.indexOf(el) === i);
  }
  return list.filter(shown);
}

export function findTarget(root: ParentNode, t: Target): HTMLElement | null {
  return findAll(root, t)[t.nth ?? 0] || null;
}
