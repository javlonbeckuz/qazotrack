import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

/**
 * Storage for accounts and their qaza records.
 *
 * SQLite comes with Node 24 (`node:sqlite`), so this adds no dependency and no
 * separate database process to run or deploy. The file lives outside the build
 * output so a rebuild cannot delete somebody's record.
 */
const dataDir = process.env.QAZOTRACK_DATA ?? path.resolve(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "qazotrack.db"));

// WAL lets a read run while a write is in flight, which matters once more than
// one person is using the same instance.
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS records (
    user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile    TEXT,
    targets    TEXT,
    counts     TEXT,
    history    TEXT,
    updated_at TEXT NOT NULL
  );
`);

export type UserRow = { id: string; email: string; password_hash: string; created_at: string };
export type RecordRow = { profile: string | null; targets: string | null; counts: string | null; history: string | null; updated_at: string };

// Email is compared and stored lowercased; the UNIQUE index is what actually
// prevents two accounts differing only by case.
export const findUserByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
export const findUserById = db.prepare("SELECT * FROM users WHERE id = ?");
export const insertUser = db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)");

export const insertSession = db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)");
export const findSession = db.prepare("SELECT * FROM sessions WHERE token_hash = ?");
export const deleteSession = db.prepare("DELETE FROM sessions WHERE token_hash = ?");
export const deleteExpiredSessions = db.prepare("DELETE FROM sessions WHERE expires_at < ?");

export const findRecord = db.prepare("SELECT profile, targets, counts, history, updated_at FROM records WHERE user_id = ?");
export const upsertRecord = db.prepare(`
  INSERT INTO records (user_id, profile, targets, counts, history, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    profile = excluded.profile,
    targets = excluded.targets,
    counts = excluded.counts,
    history = excluded.history,
    updated_at = excluded.updated_at
`);

/** Expired rows are only cleared on boot and on login; there is no scheduler. */
export function purgeExpiredSessions() {
  deleteExpiredSessions.run(new Date().toISOString());
}
