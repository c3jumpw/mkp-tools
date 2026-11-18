/**
 * Keeps the guide and the getting-started tour in step with the app.
 *
 *   npm run guide:check
 *
 * Fails when:
 *   - a page in src/app has no annotated screenshot (add a shot to capture.mjs),
 *   - a screenshot is missing from the tour or the Guide page (add a slide / <Shot>),
 *   - a screenshot points at a page that no longer exists,
 *   - figures.ts names an image that isn't in public/guide/shots.
 *
 * CI runs it after every capture, so a new screen can't ship without a guide
 * entry. The words still need a person: this only checks that they exist.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(APP, p), "utf8");

/** Pages that explain the app rather than being part of it, or only redirect. */
const EXEMPT = new Set(["/", "/guide", "/tour"]);

const figuresSrc = read("src/app/guide/figures.ts");
const figures = {};
for (const m of figuresSrc.matchAll(/^ {2}"([\w-]+)": \{\n([\s\S]*?)\n {2}\},$/gm)) {
  figures[m[1]] = {
    route: /"route": "([^"]+)"/.exec(m[2])?.[1],
    src: /"src": "([^"]+)"/.exec(m[2])?.[1],
  };
}

function pages(dir, route = "") {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      // Route groups and private folders don't add a URL segment.
      if (e.name.startsWith("_")) continue;
      const seg = /^\(.*\)$/.test(e.name) ? "" : `/${e.name}`;
      out.push(...pages(path.join(dir, e.name), route + seg));
    } else if (/^page\.(tsx|ts|jsx|js)$/.test(e.name)) {
      out.push(route || "/");
    }
  }
  return out;
}

const routes = pages(path.join(APP, "src/app"));
const tour = read("src/app/tour/slides.tsx");
const guide = read("src/app/guide/page.tsx");
const inTour = new Set([...tour.matchAll(/fig: "([\w-]+)"/g)].map((m) => m[1]));
const inGuide = new Set([...guide.matchAll(/<Shot name="([\w-]+)"/g)].map((m) => m[1]));

const problems = [];
const names = Object.keys(figures);
if (names.length === 0) problems.push("figures.ts has no screenshots. Run `npm run guide:capture`.");

const covered = new Set(names.map((n) => figures[n].route));
for (const r of routes) {
  if (!EXEMPT.has(r) && !covered.has(r)) {
    problems.push(`Page ${r} has no guide screenshot. Add a shot(...) for it in guide-capture/capture.mjs.`);
  }
}
for (const n of names) {
  const f = figures[n];
  if (!f.route) problems.push(`Screenshot "${n}" has no route in figures.ts.`);
  else if (!routes.includes(f.route)) problems.push(`Screenshot "${n}" shows ${f.route}, which is no longer a page.`);
  if (!inTour.has(n)) problems.push(`Screenshot "${n}" isn't in the tour. Add a slide with fig: "${n}" to src/app/tour/slides.tsx.`);
  if (!inGuide.has(n)) problems.push(`Screenshot "${n}" isn't on the Guide page. Add <Shot name="${n}" /> to src/app/guide/page.tsx.`);
  if (!f.src || !fs.existsSync(path.join(APP, "public", f.src))) problems.push(`Screenshot "${n}": image ${f.src} is missing.`);
}
for (const n of new Set([...inTour, ...inGuide])) {
  if (!(n in figures)) problems.push(`"${n}" is used by the tour or Guide but isn't a screenshot in figures.ts.`);
}

if (problems.length) {
  console.error(`Guide check failed:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(
  `Guide check passed: ${names.length} screenshots cover ${routes.length - [...EXEMPT].filter((r) => routes.includes(r)).length} pages, all in the tour and the Guide.`,
);
