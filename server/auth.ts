import crypto from "node:crypto";
import type { Request, Response } from "express";
import { deleteSession, findSession, findUserById, insertSession, type UserRow } from "./db";

/**
 * Passwords and sessions.
 *
 * scrypt ships with Node, so there is no bcrypt build step and nothing to keep
 * patched. The cost parameters below are the Node defaults raised to the value
 * scrypt's author suggests for interactive logins; N is the one that matters.
 */
const SCRYPT_N = 16384;
const SCRYPT_KEYLEN = 64;
const SESSION_DAYS = 30;
export const SESSION_COOKIE = "qz_session";

function scrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // maxmem has to be raised alongside N or Node rejects the call outright.
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt);
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, , saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"));
  // Lengths must match before timingSafeEqual, which throws otherwise.
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

/**
 * Sessions are opaque random tokens. Only their SHA-256 is stored, so a leaked
 * copy of the database cannot be replayed as a set of live logins.
 */
const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DAYS * 86400000);
  insertSession.run(hashToken(token), userId, now.toISOString(), expires.toISOString());
  return token;
}

export function readSessionCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Only sent over TLS in production; in dev the origin is plain http.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
}

export function destroySession(token: string) {
  deleteSession.run(hashToken(token));
}

/** Returns the signed-in user, or null when there is no valid unexpired session. */
export function currentUser(req: Request): UserRow | null {
  const token = readSessionCookie(req);
  if (!token) return null;
  const session = findSession.get(hashToken(token)) as { user_id: string; expires_at: string } | undefined;
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    deleteSession.run(hashToken(token));
    return null;
  }
  return (findUserById.get(session.user_id) as UserRow | undefined) ?? null;
}

/**
 * Throttles credential guessing per client address. In memory on purpose: this
 * runs as a single process, and a restart clearing the counters is a smaller
 * problem than a second store to keep consistent.
 */
const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function tooManyAttempts(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string) {
  const entry = attempts.get(key);
  if (!entry || Date.now() - entry.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else entry.count += 1;
}

export function clearFailures(key: string) {
  attempts.delete(key);
}
