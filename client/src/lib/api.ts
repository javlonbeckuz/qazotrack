import type { Profile } from "./qaza";

/**
 * Talks to the account API.
 *
 * The session lives in an httpOnly cookie, so there is no token for this file
 * to hold or hand around — `credentials: "include"` is the whole of it, and
 * script on the page cannot read the session even if something malicious ends
 * up running there.
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: "include",
      headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    });
  } catch {
    // A dropped connection is not the same as a rejected request, and the
    // reader deserves to be told which one happened.
    throw new ApiError("offline");
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError((body?.error as ApiErrorCode) ?? "badRequest");
  return body as T;
}

export const signUp = (email: string, password: string) =>
  request<{ user: User }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });

export const logIn = (email: string, password: string) =>
  request<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const logOut = () => request<void>("/auth/logout", { method: "POST" });

export const me = () => request<{ user: User }>("/auth/me");

export const getState = () => request<RemoteState>("/state");

export const putState = (state: Omit<RemoteState, "updatedAt">) =>
  request<void>("/state", { method: "PUT", body: JSON.stringify(state) });
