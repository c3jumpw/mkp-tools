/**
 * Where "seen up to" markers for the What's new pop-up are kept. Safe to
 * import anywhere; the change log itself is server-only (src/lib/changelog.ts).
 */

/** Account user metadata key: the last change log seq this person dismissed. Follows them across devices. */
export const SEEN_META_KEY = "cb_seen_changes";

/** Per-device copy, "<user id>:<seq>", so a dismissal sticks even if it couldn't be saved offline. */
export const SEEN_LOCAL_KEY = "cb.whatsnew.seen";
