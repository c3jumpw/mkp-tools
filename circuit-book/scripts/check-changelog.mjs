/**
 * Validates src/content/changelog.json, and (with --since <git ref>) that a
 * change to the app came with a change log entry.
 *
 *   npm run changelog:check                       validate the file
 *   node scripts/check-changelog.mjs --since <ref> also require an entry for app changes since <ref>
 *
 * A commit can opt out with "[no changelog]" in its message, for changes no
 * one would ever need a record of (a typo in a comment, say).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = "src/content/changelog.json";
const KINDS = ["new", "improved", "fixed", "internal"];
const AUDIENCES = ["everyone", "admins"];

const problems = [];
let entries;
try {
  entries = JSON.parse(fs.readFileSync(path.join(APP, FILE), "utf8"));
} catch (e) {
  console.error(`${FILE} is not valid JSON: ${e.message}`);
  process.exit(1);
}

const figures = new Set(
  [...fs.readFileSync(path.join(APP, "src/app/guide/figures.ts"), "utf8").matchAll(/^ {2}"([\w-]+)": \{/gm)].map((m) => m[1]),
);

if (!Array.isArray(entries) || entries.length === 0) problems.push("The change log must be a non-empty array.");
else {
  entries.forEach((e, i) => {
    const at = `Entry ${i + 1}${e?.title ? ` ("${e.title}")` : ""}`;
    if (e.seq !== i + 1) problems.push(`${at}: seq should be ${i + 1}. Entries go oldest first, numbered 1, 2, 3… and are never renumbered.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date ?? "") || Number.isNaN(Date.parse(e.date))) problems.push(`${at}: date must be YYYY-MM-DD.`);
    if (i > 0 && e.date < entries[i - 1].date) problems.push(`${at}: dated before the entry above it.`);
    if (!KINDS.includes(e.kind)) problems.push(`${at}: kind must be one of ${KINDS.join(", ")}.`);
    if (!AUDIENCES.includes(e.audience)) problems.push(`${at}: audience must be "everyone" or "admins".`);
    if (typeof e.announce !== "boolean") problems.push(`${at}: announce must be true or false.`);
    if (e.kind === "internal" && e.announce) problems.push(`${at}: internal changes are never announced; set announce to false.`);
    if (!e.title?.trim()) problems.push(`${at}: needs a title.`);
    if (!e.summary?.trim()) problems.push(`${at}: needs a summary.`);
    if (e.details && (!Array.isArray(e.details) || e.details.some((d) => typeof d !== "string" || !d.trim())))
      problems.push(`${at}: details must be a list of sentences.`);
    if (e.link && (!e.link.href?.startsWith("/") || !e.link.label?.trim()))
      problems.push(`${at}: link needs an in-app href starting with "/" and a label.`);
    if (e.figure && !figures.has(e.figure))
      problems.push(`${at}: figure "${e.figure}" isn't a guide screenshot (src/app/guide/figures.ts).`);
    if (e.commits && (!Array.isArray(e.commits) || e.commits.some((c) => !/^[0-9a-f]{7,40}$/.test(c))))
      problems.push(`${at}: commits must be git SHAs.`);
  });
}

// --since: did app changes come with an entry?
const since = process.argv.includes("--since") ? process.argv[process.argv.indexOf("--since") + 1] : null;
if (since && !/^0+$/.test(since)) {
  const git = (...args) => execFileSync("git", args, { cwd: APP, encoding: "utf8" }).trim();
  const range = `${since}..HEAD`;
  const changed = git("diff", "--name-only", range, "--", ".").split("\n").filter(Boolean);
  // What counts as a change to the app: its code, styles, public files and
  // database, but not generated guide screenshots, docs or tooling.
  const appChanges = changed.filter(
    (f) =>
      /^circuit-book\/(src|public|supabase)\//.test(f) &&
      !f.startsWith("circuit-book/public/guide/shots/") &&
      f !== "circuit-book/src/app/guide/figures.ts" &&
      f !== `circuit-book/${FILE}`,
  );
  const touchedLog = changed.includes(`circuit-book/${FILE}`);
  const optedOut = /\[no changelog\]/i.test(git("log", "--format=%B", range));
  if (appChanges.length && !touchedLog && !optedOut) {
    problems.push(
      `These app changes have no change log entry:\n      ${appChanges.slice(0, 8).join("\n      ")}${
        appChanges.length > 8 ? `\n      …and ${appChanges.length - 8} more` : ""
      }\n    Add one to ${FILE} (see CLAUDE.md), or put "[no changelog]" in the commit message if no one would ever need a record of it.`,
    );
  }
}

if (problems.length) {
  console.error(`Change log check failed:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`Change log check passed: ${entries.length} entries, latest #${entries.at(-1).seq} on ${entries.at(-1).date}.`);
