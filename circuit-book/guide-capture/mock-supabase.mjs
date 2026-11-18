/**
 * A local stand-in for the Supabase project, used only to take the guide's
 * screenshots. The app is built pointing at this server, so both the browser
 * and the auth check in src/proxy.ts talk to it — the real pages run end to
 * end on demo data and no real account or database is involved.
 *
 * POST /__scenario {"name": "..."} switches which sessions exist and which sets
 * are ticked, so one run can show a fresh session, a superset mid-way, etc.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as F from "./fixtures.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ILLUSTRATIONS = path.join(HERE, "illustrations");

/** Far-future expiry: the token has to stay valid whenever the job runs. */
const EXP = 4102444800; // 2100-01-01
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");

const USER = {
  id: F.USER.id, aud: "authenticated", role: "authenticated", email: F.USER.email,
  email_confirmed_at: "2026-10-01T12:00:00Z", phone: "",
  app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [],
  created_at: "2026-10-01T12:00:00Z", updated_at: "2026-10-01T12:00:00Z",
};
const ACCESS = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url({
  sub: F.USER.id, aud: "authenticated", role: "authenticated", email: F.USER.email,
  exp: EXP, iat: 1790000000, session_id: "guide-capture",
})}.guide-capture`;
const SESSION = {
  access_token: ACCESS, token_type: "bearer", expires_in: EXP - 1790000000, expires_at: EXP,
  refresh_token: "guide-capture", user: USER,
};

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS,HEAD",
  "access-control-expose-headers": "content-range, x-total-count",
};

/* --- Scenarios ------------------------------------------------------------ */

const state = { sessions: [], done: {} };
export const writes = [];

export function scenario(name) {
  const S = F.SESSIONS;
  const history = [S.push, S.leg28, S.push27, S.leg26, S.cond24];
  state.done = {
    "s-push": F.firstN(S.push, 4),
    "h-leg28": F.firstN(S.leg28, 19),
    "h-push27": F.firstN(S.push27, 10),
    "h-leg26": F.firstN(S.leg26, 17),
    "h-cond24": F.firstN(S.cond24, 12),
  };
  if (name === "empty") {
    state.sessions = [];
    state.empty = true;
    return;
  }
  state.empty = false;
  if (name === "plain") {
    state.sessions = history;
    return;
  }
  state.sessions = [S.live, ...history];
  state.done["s-live"] =
    name === "straight" ? F.firstN(S.live, 1)
    : name === "superset" ? F.firstN(S.live, 6)
    : name === "finished" ? F.firstN(S.live, 19)
    : [];
}
scenario("plain");

/* --- REST ----------------------------------------------------------------- */

const eq = (p, k) => {
  const v = p.get(k);
  return v && v.startsWith("eq.") ? v.slice(3) : null;
};
const inList = (p, k) => {
  const v = p.get(k);
  return v && v.startsWith("in.(") ? v.slice(4, -1).split(",").map((s) => s.replace(/^"|"$/g, "")) : null;
};

function sessionRow(s) {
  return {
    id: s.id, user_id: s.user_id, routine_id: s.routine_id, routine_name: s.routine_name,
    started_at: s.started_at, completed_at: s.completed_at, notes: null,
    cb_session_blocks: s.blocks.map((b) => ({ ...b, cb_session_items: s.items.filter((i) => i.block_id === b.id) })),
    cb_session_sets: F.setsFor(s, state.done[s.id] ?? []),
  };
}

function restGet(table, p) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  if (state.empty && table !== "cb_sessions") return [];
  switch (table) {
    case "cb_workouts": {
      const id = eq(p, "id");
      return [...F.WORKOUTS].filter((w) => !id || w.id === id).sort(byName);
    }
    case "cb_workout_images": {
      const one = eq(p, "workout_id");
      const many = inList(p, "workout_id");
      return F.IMAGES.filter((i) => (one ? i.workout_id === one : many ? many.includes(i.workout_id) : true));
    }
    case "cb_routines": {
      const id = eq(p, "id");
      return F.ROUTINE_IDS.filter((r) => !id || r === id).map(F.routineRow).sort(byName);
    }
    case "cb_routine_blocks": return F.routineBlocks(eq(p, "routine_id"));
    case "cb_routine_items": {
      const rid = eq(p, "routine_id");
      if (rid) return F.routineItems(rid);
      const all = F.ROUTINE_IDS.flatMap((r) => F.routineItems(r));
      const wid = eq(p, "workout_id");
      const blocks = inList(p, "block_id");
      return all.filter((i) => (!wid || i.workout_id === wid) && (!blocks || blocks.includes(i.block_id)));
    }
    case "cb_routine_days": return F.routineDays(eq(p, "routine_id"));
    case "cb_sessions": {
      const id = eq(p, "id");
      let rows = state.sessions.filter((s) => !id || s.id === id);
      if (p.get("completed_at") === "is.null") rows = rows.filter((s) => !s.completed_at);
      rows = [...rows].sort((a, b) => b.started_at.localeCompare(a.started_at));
      const limit = Number(p.get("limit") || 0);
      if (limit) rows = rows.slice(0, limit);
      return rows.map(sessionRow);
    }
    case "cb_session_blocks": return state.sessions.find((s) => s.id === eq(p, "session_id"))?.blocks ?? [];
    case "cb_session_items": return state.sessions.find((s) => s.id === eq(p, "session_id"))?.items ?? [];
    case "cb_session_sets": {
      const s = state.sessions.find((x) => x.id === eq(p, "session_id"));
      return s ? F.setsFor(s, state.done[s.id] ?? []) : [];
    }
    default:
      return [];
  }
}

/* --- Server ----------------------------------------------------------------- */

function body(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

export function startMock(port) {
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, `http://${req.headers.host}`);
    const send = (status, payload, type = "application/json") => {
      res.writeHead(status, { ...CORS, ...(payload === null ? {} : { "content-type": type }) });
      res.end(payload === null ? "" : type === "application/json" ? JSON.stringify(payload) : payload);
    };

    if (req.method === "OPTIONS") return send(204, null);

    if (u.pathname === "/__scenario" && req.method === "POST") {
      scenario(JSON.parse((await body(req)) || "{}").name);
      return send(200, { ok: true });
    }
    if (u.pathname === "/__writes") {
      if (req.method === "DELETE") writes.length = 0;
      return send(200, writes);
    }

    if (u.pathname.startsWith("/auth/v1/token")) return send(200, SESSION);
    if (u.pathname === "/auth/v1/user") {
      return (req.headers.authorization || "").includes(ACCESS) ? send(200, USER) : send(401, { msg: "no session" });
    }
    if (u.pathname.startsWith("/auth/v1/logout")) return send(204, null);
    if (u.pathname.startsWith("/auth/v1/")) return send(200, {});

    if (u.pathname === "/storage/v1/object/sign/cb-workout-images" && req.method === "POST") {
      const { paths = [] } = JSON.parse((await body(req)) || "{}");
      return send(200, paths.map((p) => ({ error: null, path: p, signedURL: `/object/sign/cb-workout-images/${p}?token=demo` })));
    }
    if (u.pathname.startsWith("/storage/v1/object/sign/cb-workout-images/")) {
      const file = path.join(ILLUSTRATIONS, path.basename(u.pathname));
      return fs.existsSync(file) ? send(200, fs.readFileSync(file), "image/svg+xml") : send(404, null);
    }

    if (u.pathname.startsWith("/rest/v1/")) {
      const table = u.pathname.slice("/rest/v1/".length);
      if (req.method !== "GET" && req.method !== "HEAD") {
        await body(req);
        writes.push(`${req.method} ${table}?${u.searchParams.toString()}`);
        return send(201, null);
      }
      const rows = restGet(table, u.searchParams);
      const single = (req.headers.accept || "").includes("vnd.pgrst.object");
      return send(200, single ? (rows[0] ?? null) : rows);
    }

    return send(404, null);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}
