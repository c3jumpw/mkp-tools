// Runs before every build (see package.json). Stops a release that would leave
// the Getting started tour or the release notes behind. Details in TOUR.md.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const errors = [];

// Every page in the app, as a route ("/contacts/[id]"), leaving out the tour's own sample screens.
function pages(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pages(p, out);
    else if (e.name === "page.tsx") out.push(p);
  }
  return out;
}
const routes = pages(path.join(root, "src/app"))
  .map((p) => path.relative(path.join(root, "src/app"), path.dirname(p)).split(path.sep))
  .filter((parts) => !parts.includes("tour") || parts.length === 1)
  .map((parts) => "/" + parts.filter((x) => x && !/^\(.*\)$/.test(x)).join("/"))
  .map((r) => (r === "/." ? "/" : r));

const slides = read("src/lib/tour/slides.ts");
const covered = new Set([...slides.matchAll(/covers:\s*\[((?:\s*"[^"]*"\s*,?)*)\s*\]/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])));
const untouredBlock = slides.match(/UNTOURED[^=]*=\s*\{([\s\S]*?)\};/);
const untoured = new Set(untouredBlock ? [...untouredBlock[1].matchAll(/"([^"]+)":/g)].map((m) => m[1]) : []);
for (const r of routes) {
  if (!covered.has(r) && !untoured.has(r)) {
    errors.push(`Page ${r} has no tour step. Add it to a step's "covers" in src/lib/tour/slides.ts (or to UNTOURED with a reason).`);
  }
}
for (const r of covered) {
  if (!routes.includes(r)) errors.push(`A tour step covers ${r}, but there's no such page any more.`);
}

// Every screen a step uses must exist.
const screens = new Set([...read("src/lib/tour/screens.ts").matchAll(/^\s*"([a-z-]+\/[a-z-]+)",$/gm)].map((m) => m[1]));
for (const m of slides.matchAll(/screen:\s*"([^"]+)"/g)) {
  if (!screens.has(m[1])) errors.push(`Tour step uses screen "${m[1]}", which isn't in src/lib/tour/screens.ts.`);
}

// Change log (src/data/changelog.json): the newest entry is the version being
// shipped, entries are in order, and every change says what it is and who it's for.
const slideIds = new Set([...slides.matchAll(/^\s{4}id:\s*"([^"]+)"/gm)].map((m) => m[1]));
const pkg = JSON.parse(read("package.json"));
const LOG = "src/data/changelog.json";
let releases = [];
try {
  releases = JSON.parse(read(LOG)).releases || [];
} catch (e) {
  errors.push(`${LOG} isn't valid JSON (${e.message}).`);
}
const KINDS = ["new", "improved", "fixed", "behind-the-scenes"];
const AUDIENCES = ["everyone", "admin"];
const AREAS = ["App", "Home", "Contacts", "Tags", "Blasts", "Blast Deck", "Settings", "Help", "Accounts", "Setup", "Admin"];
const semver = (v) => v.split(".").map(Number);
const newer = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};
const latestAllowed = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10);
if (!releases.length || releases[0].version !== pkg.version) {
  errors.push(
    `package.json is version ${pkg.version} but the newest entry in ${LOG} is ${releases[0]?.version ?? "missing"}. Add a change log entry for this version.`
  );
}
releases.forEach((r, i) => {
  const at = `${LOG} ${r.version ?? `entry ${i + 1}`}`;
  if (!/^\d+\.\d+\.\d+$/.test(r.version || "")) errors.push(`${at}: version should look like 1.2.3.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || "") || isNaN(Date.parse(r.date))) errors.push(`${at}: date should be YYYY-MM-DD.`);
  else if (r.date > latestAllowed) errors.push(`${at}: date ${r.date} is in the future.`);
  if (!r.title) errors.push(`${at}: needs a title.`);
  const prev = releases[i - 1];
  if (prev && !newer(prev.version, r.version)) errors.push(`${at}: versions must go newest first (${prev.version} comes before ${r.version}).`);
  if (prev && prev.date < r.date) errors.push(`${at}: dates must go newest first (${prev.date} comes before ${r.date}).`);
  if (!Array.isArray(r.changes) || !r.changes.length) errors.push(`${at}: list at least one change.`);
  for (const c of r.changes || []) {
    const what = `${at} "${c.title || "untitled change"}"`;
    if (!c.title) errors.push(`${what}: needs a title.`);
    if (!KINDS.includes(c.kind)) errors.push(`${what}: kind must be one of ${KINDS.join(", ")}.`);
    if (!AUDIENCES.includes(c.audience)) errors.push(`${what}: audience must be "everyone" or "admin" (who it applies to).`);
    if (!AREAS.includes(c.area)) errors.push(`${what}: area must be one of ${AREAS.join(", ")}.`);
    if (c.slide && !slideIds.has(c.slide)) errors.push(`${what}: points to tour step "${c.slide}", which doesn't exist.`);
  }
  for (const id of r.slides || []) {
    if (!slideIds.has(id)) errors.push(`${at}: points to tour step "${id}", which doesn't exist.`);
  }
});

if (errors.length) {
  console.error("\nTour check failed:\n" + errors.map((e) => "  • " + e).join("\n") + "\n");
  process.exit(1);
}
const changeCount = releases.reduce((n, r) => n + (r.changes?.length || 0), 0);
console.log(
  `Tour check passed: ${routes.length} pages covered, ${slideIds.size} steps, version ${pkg.version}. Change log: ${releases.length} updates, ${changeCount} changes.`
);
