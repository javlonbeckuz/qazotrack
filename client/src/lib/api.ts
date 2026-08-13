import { AppwriteException, ID, Permission, Role } from "appwrite";
import { DATABASE_ID, RECORDS_TABLE_ID, SUGGESTIONS_TABLE_ID, account, tables } from "./appwrite";
import type { Profile } from "./qaza";

/**
 * Talks to Appwrite.
 *
 * This module is the whole of the backend as far as the rest of the client is
 * concerned: the same six calls it has always exported, and the same error
 * codes, so no screen had to change when the Express server behind it was
 * replaced by Appwrite Auth and one document per reader.
 *
 * Unlike the previous httpOnly session cookie, the SDK keeps the session where
 * page script can reach it — the site and the API are on different domains, so
 * the cookie cannot be shared. Anything that gets script onto the page can take
 * a session with it. Putting both behind one domain would restore the old
 * guarantee.
 */
export type ApiErrorCode =
  | "emailInvalid"
  | "passwordShort"
  | "emailTaken"
  | "credentialsWrong"
  | "rateLimited"
  | "unauthorized"
  | "badRequest"
  | "offline";

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode) {
    super(code);
    this.code = code;
  }
}

export type User = { id: string; email: string; createdAt: string };
export type Counts = Record<string, number>;
export type History = Record<string, Record<string, number>>;
export type RemoteState = {
  profile: Profile | null;
  targets: Counts | null;
  counts: Counts | null;
  history: History | null;
  updatedAt: string | null;
};

/** Matches the server's old zod rule: reject the obviously malformed, no more. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/**
 * Appwrite reports failures as a `type` string plus an HTTP status. Mapping on
 * the type is what keeps the codes stable — the statuses are shared by several
 * conditions that the reader needs told apart.
 */
function toApiError(error: unknown): ApiError {
  if (!(error instanceof AppwriteException)) {
    // A dropped connection is not the same as a rejected request, and the
    // reader deserves to be told which one happened.
    return new ApiError("offline");
  }
  switch (error.type) {
    case "user_already_exists":
    case "user_email_already_exists":
      return new ApiError("emailTaken");
    case "user_invalid_credentials":
    case "user_password_mismatch":
      return new ApiError("credentialsWrong");
    case "password_personal_data":
    case "general_argument_invalid":
      return new ApiError("badRequest");
    case "general_rate_limit_exceeded":
      return new ApiError("rateLimited");
    case "general_unauthorized_scope":
    case "user_unauthorized":
    case "user_session_not_found":
      return new ApiError("unauthorized");
  }
  switch (error.code) {
    case 401:
      return new ApiError("unauthorized");
    case 409:
      return new ApiError("emailTaken");
    case 429:
      return new ApiError("rateLimited");
    case 0:
      return new ApiError("offline");
  }
  return new ApiError("badRequest");
}

type Account = { $id: string; email: string; $createdAt: string };
const publicUser = (user: Account): User => ({
  id: user.$id,
  email: user.email,
  createdAt: user.$createdAt,
});

/**
 * Checked here rather than left to Appwrite so that a bad address and a short
 * password stay two different messages. Appwrite answers both with one code.
 */
function validate(email: string, password: string) {
  if (!EMAIL.test(email)) throw new ApiError("emailInvalid");
  if (password.length < MIN_PASSWORD) throw new ApiError("passwordShort");
}

export async function signUp(email: string, password: string): Promise<{ user: User }> {
  const normalised = email.trim().toLowerCase();
  validate(normalised, password);
  try {
    await account.create({ userId: ID.unique(), email: normalised, password });
    // Creating the account does not sign anyone in; the reader expects to land
    // signed in, exactly as the old signup endpoint left them.
    await account.createEmailPasswordSession({ email: normalised, password });
    return { user: publicUser((await account.get()) as Account) };
  } catch (error) {
    throw toApiError(error);
  }
}

export async function logIn(email: string, password: string): Promise<{ user: User }> {
  const normalised = email.trim().toLowerCase();
  try {
    await account.createEmailPasswordSession({ email: normalised, password });
    return { user: publicUser((await account.get()) as Account) };
  } catch (error) {
    throw toApiError(error);
  }
}

export async function logOut(): Promise<void> {
  try {
    await account.deleteSession({ sessionId: "current" });
  } catch (error) {
    // Already signed out is the state the caller asked for, not a failure.
    if (toApiError(error).code !== "unauthorized") throw toApiError(error);
  }
}

export async function me(): Promise<{ user: User }> {
  try {
    return { user: publicUser((await account.get()) as Account) };
  } catch (error) {
    throw toApiError(error);
  }
}

/** The four state fields are stored as JSON strings, as they were as TEXT columns. */
type RecordRow = {
  $updatedAt: string;
  profile: string | null;
  targets: string | null;
  counts: string | null;
  history: string | null;
};

const read = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};
const write = (value: unknown) => (value == null ? null : JSON.stringify(value));

const EMPTY: RemoteState = { profile: null, targets: null, counts: null, history: null, updatedAt: null };

export async function getState(): Promise<RemoteState> {
  const user = await me();
  try {
    const row = (await tables.getRow({
      databaseId: DATABASE_ID,
      tableId: RECORDS_TABLE_ID,
      rowId: user.user.id,
    })) as unknown as RecordRow;
    return {
      profile: read(row.profile),
      targets: read(row.targets),
      counts: read(row.counts),
      history: read(row.history),
      updatedAt: row.$updatedAt,
    };
  } catch (error) {
    // No row yet is what a reader who has never saved looks like, and the old
    // endpoint answered that with empty fields rather than an error.
    if (error instanceof AppwriteException && error.code === 404) return EMPTY;
    throw toApiError(error);
  }
}

export async function putState(state: Omit<RemoteState, "updatedAt">): Promise<void> {
  const user = await me();
  try {
    // Upsert rather than update-then-create: the first save and every later one
    // are the same call, so there is no window in which a failed create leaves
    // the reader with nothing stored.
    //
    // The permissions name this one reader, which is what makes a row private.
    // No other account, signed in or not, can read it.
    await tables.upsertRow({
      databaseId: DATABASE_ID,
      tableId: RECORDS_TABLE_ID,
      rowId: user.user.id,
      data: {
        profile: write(state.profile),
        targets: write(state.targets),
        counts: write(state.counts),
        history: write(state.history),
      },
      permissions: [
        Permission.read(Role.user(user.user.id)),
        Permission.update(Role.user(user.user.id)),
        Permission.delete(Role.user(user.user.id)),
      ],
    });
  } catch (error) {
    throw toApiError(error);
  }
}

/**
 * Sends a suggestion to the app's owner.
 *
 * It is written to a table the reader can add to and nobody can read back —
 * not even the person who wrote it. That is deliberate: a static site has
 * nowhere to keep a secret, so any address it could post to would be sitting in
 * the JavaScript the browser downloads. Writing to a closed table keeps the
 * owner's address out of the build entirely.
 *
 * `contact` is optional and is the sender's own address, given only if they
 * want a reply.
 */
export async function sendSuggestion(message: string, contact: string): Promise<void> {
  const text = message.trim();
  if (text.length < 2) throw new ApiError("badRequest");
  try {
    await tables.createRow({
      databaseId: DATABASE_ID,
      tableId: SUGGESTIONS_TABLE_ID,
      rowId: ID.unique(),
      // No permissions: the row is write-only from the browser's side, readable
      // only through the console or an API key, which the client never holds.
      data: { message: text.slice(0, 4000), contact: contact.trim().slice(0, 254) || null },
    });
  } catch (error) {
    throw toApiError(error);
  }
}
