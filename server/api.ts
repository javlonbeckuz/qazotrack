import express, { type Request, type Response } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { findRecord, findUserByEmail, insertUser, purgeExpiredSessions, upsertRecord, type RecordRow, type UserRow } from "./db";
import {
  clearFailures,
  clearSessionCookie,
  createSession,
  currentUser,
  destroySession,
  hashPassword,
  readSessionCookie,
  recordFailure,
  setSessionCookie,
  tooManyAttempts,
  verifyPassword,
} from "./auth";

/**
 * Errors are returned as codes rather than sentences. Every string the reader
 * sees is translated in the client's copy table, and the server has no idea
 * which of the three languages is on screen.
 */
type ErrorCode =
  | "emailInvalid"
  | "passwordShort"
  | "emailTaken"
  | "credentialsWrong"
  | "rateLimited"
  | "unauthorized"
  | "badRequest";

const fail = (res: Response, status: number, error: ErrorCode) => res.status(status).json({ error });

// Deliberately permissive: the only reliable test of an address is sending to
// it, and this app never does. It rejects the obviously malformed, no more.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const credentials = z.object({
  email: z.string().trim().toLowerCase().min(3).max(254).regex(EMAIL),
  password: z.string().min(8).max(200),
});

const counts = z.record(z.string(), z.number()).nullable().optional();
const state = z.object({
  profile: z
    .object({
      birthDate: z.string(),
      gender: z.enum(["male", "female"]),
      startPrayingDate: z.string().nullable(),
      menstruationAvgDaysPerMonth: z.number(),
    })
    .nullable()
    .optional(),
  targets: counts,
  counts,
  history: z.record(z.string(), z.record(z.string(), z.number())).nullable().optional(),
});

const publicUser = (user: UserRow) => ({ id: user.id, email: user.email, createdAt: user.created_at });

/** Rate-limit key. Behind a proxy this needs `app.set("trust proxy", …)` to be meaningful. */
const clientKey = (req: Request) => req.ip ?? req.socket.remoteAddress ?? "unknown";

/**
 * Returns a full express app rather than a bare Router. `res.json` and
 * `res.cookie` live on express's own response prototype, which only an app
 * installs — a Router dropped straight into Vite's connect stack would have
 * neither. The app is mounted whole in both dev and production.
 */
export function createApi() {
  const app = express();
  const api = express.Router();
  api.use(express.json({ limit: "1mb" }));

  purgeExpiredSessions();

  api.post("/auth/signup", async (req, res) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) {
      // Which field failed is worth saying — this is the reader's own input,
      // not a hint about whether an account exists.
      const badPassword = parsed.error.issues.some((issue) => issue.path[0] === "password");
      return fail(res, 400, badPassword ? "passwordShort" : "emailInvalid");
    }
    const { email, password } = parsed.data;

    if (findUserByEmail.get(email)) return fail(res, 409, "emailTaken");

    const user: UserRow = {
      id: crypto.randomUUID(),
      email,
      password_hash: await hashPassword(password),
      created_at: new Date().toISOString(),
    };
    insertUser.run(user.id, user.email, user.password_hash, user.created_at);

    setSessionCookie(res, createSession(user.id));
    res.status(201).json({ user: publicUser(user) });
  });

  api.post("/auth/login", async (req, res) => {
    const key = clientKey(req);
    if (tooManyAttempts(key)) return fail(res, 429, "rateLimited");

    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "credentialsWrong");
    const { email, password } = parsed.data;

    const user = findUserByEmail.get(email) as UserRow | undefined;
    // Same response and roughly the same work whether or not the address is
    // registered, so this cannot be used to enumerate who has an account.
    const ok = user ? await verifyPassword(password, user.password_hash) : await verifyPassword(password, "scrypt$16384$00$00");
    if (!user || !ok) {
      recordFailure(key);
      return fail(res, 401, "credentialsWrong");
    }

    clearFailures(key);
    purgeExpiredSessions();
    setSessionCookie(res, createSession(user.id));
    res.json({ user: publicUser(user) });
  });

  api.post("/auth/logout", (req, res) => {
    const token = readSessionCookie(req);
    if (token) destroySession(token);
    clearSessionCookie(res);
    res.status(204).end();
  });

  api.get("/auth/me", (req, res) => {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "unauthorized");
    res.json({ user: publicUser(user) });
  });

  api.get("/state", (req, res) => {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "unauthorized");
    const row = findRecord.get(user.id) as RecordRow | undefined;
    if (!row) return res.json({ profile: null, targets: null, counts: null, history: null, updatedAt: null });
    const read = (value: string | null) => {
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };
    res.json({
      profile: read(row.profile),
      targets: read(row.targets),
      counts: read(row.counts),
      history: read(row.history),
      updatedAt: row.updated_at,
    });
  });

  api.put("/state", (req, res) => {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "unauthorized");
    const parsed = state.safeParse(req.body);
    if (!parsed.success) return fail(res, 400, "badRequest");
    const { profile, targets, counts: made, history } = parsed.data;
    const write = (value: unknown) => (value == null ? null : JSON.stringify(value));
    upsertRecord.run(user.id, write(profile), write(targets), write(made), write(history), new Date().toISOString());
    res.status(204).end();
  });

  app.use("/api", api);

  // Anything else under /api is answered as JSON. Without this the request
  // falls through to the SPA fallback and `fetch` gets a page of HTML where it
  // expected an error object.
  app.use("/api", (_req, res) => fail(res, 404, "badRequest"));

  return app;
}
