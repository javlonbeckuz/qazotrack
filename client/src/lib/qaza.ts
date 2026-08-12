import { toGregorian, toHijri } from "hijri-converter";

/**
 * The qaza calculation, implementing docs/qaza-calculation-spec.md from the
 * original project.
 *
 * Pure functions only — no clock reads, no storage. `today` is always passed
 * in, which is what makes this testable and keeps the result stable within a
 * render.
 */

export type Gender = "male" | "female";

export interface Profile {
  /** ISO `YYYY-MM-DD`. */
  birthDate: string;
  gender: Gender;
  /** ISO date the reader began praying regularly, or null if not yet. */
  startPrayingDate: string | null;
  /** Female only. Average days per month excluded. */
  menstruationAvgDaysPerMonth: number;
  /** Optional exact maturity date, used instead of the estimate when known. */
  bulughOverride?: string | null;
}

export interface Breakdown {
  bulughDate: string;
  endDate: string;
  totalDays: number;
  excludedDays: number;
  qazaDays: number;
  /** Same count for each of the five prayers. */
  perPrayer: number;
  totalPrayers: number;
  /** True when no start date is set, so the total still grows daily. */
  stillAccumulating: boolean;
}

/** Lunar years to maturity when the exact date is unknown. */
export const BULUGH_YEARS: Record<Gender, number> = { male: 12, female: 9 };

export const DEFAULT_MENSTRUATION_DAYS = 6;

const DAY_MS = 86_400_000;

/**
 * The Gregorian range hijri-converter actually supports (AH 1356–1500). Beyond
 * it the library returns a nonsense year instead of throwing, so every
 * conversion result is checked against these bounds.
 */
const MIN_YEAR = 1937;
const MAX_YEAR = 2076;

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISODate: string): number {
  return Math.floor((parseISO(toISODate).getTime() - parseISO(fromISO).getTime()) / DAY_MS);
}

/**
 * Birth date plus N *lunar* years.
 *
 * Done by converting to the Hijri calendar, adding whole years there, and
 * converting back — not by multiplying 354.36 days. A fixed multiplier drifts
 * by roughly a day per decade against the real calendar, and the spec calls
 * for the conversion explicitly.
 *
 * Hijri months run to 29 or 30 days, so a birth on the 30th can land on a
 * month that has no 30th; the day is clamped rather than rolling into the
 * next month.
 */
export function addLunarYears(iso: string, years: number): string {
  const date = parseISO(iso);
  const h = toHijri(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const targetYear = h.hy + years;

  for (let day = h.hd; day >= 1; day -= 1) {
    const g = toGregorian(targetYear, h.hm, day);
    // hijri-converter does NOT throw outside its supported range (roughly
    // AH 1356–1500). It returns a nonsense year such as -100100, so the result
    // has to be sanity-checked rather than wrapped in a try/catch.
    if (g.gy >= MIN_YEAR && g.gy <= MAX_YEAR) {
      return toISO(new Date(Date.UTC(g.gy, g.gm - 1, g.gd)));
    }
  }
  throw new Error("Date outside the supported calendar range");
}

/** Step 1 — the maturity date, or the reader's own if they gave one. */
export function getBulughDate(profile: Profile): string {
  if (profile.bulughOverride) return profile.bulughOverride;
  return addLunarYears(profile.birthDate, BULUGH_YEARS[profile.gender]);
}

export type ValidationCode =
  | "birthDateMissing"
  | "birthDateFuture"
  | "birthDateOutOfRange"
  | "startBeforeBulugh"
  | "startInFuture";

/**
 * Rejects the combinations the spec calls out. Returning codes rather than
 * sentences keeps this module free of user-facing copy, which lives in the
 * three language tables.
 */
export function validateProfile(profile: Profile, today: string): ValidationCode[] {
  const issues: ValidationCode[] = [];
  if (!profile.birthDate) {
    issues.push("birthDateMissing");
    return issues;
  }
  if (daysBetween(profile.birthDate, today) < 0) issues.push("birthDateFuture");

  // The calendar conversion only covers roughly 1937–2076. Say so plainly
  // rather than letting a silently wrong maturity date through.
  const birthYear = Number(profile.birthDate.slice(0, 4));
  if (birthYear < MIN_YEAR || birthYear > MAX_YEAR) issues.push("birthDateOutOfRange");
  if (issues.length === 0) {
    try {
      getBulughDate(profile);
    } catch {
      issues.push("birthDateOutOfRange");
    }
  }

  if (profile.startPrayingDate) {
    if (daysBetween(profile.startPrayingDate, today) < 0) issues.push("startInFuture");
    if (issues.length === 0) {
      const bulugh = getBulughDate(profile);
      // Equal is allowed: someone who began praying the day they came of age
      // simply owes nothing.
      if (daysBetween(bulugh, profile.startPrayingDate) < 0) issues.push("startBeforeBulugh");
    }
  }
  return issues;
}

/** Steps 2–5. */
export function calculateQaza(profile: Profile, today: string): Breakdown {
  const bulughDate = getBulughDate(profile);
  const stillAccumulating = !profile.startPrayingDate;
  const endDate = profile.startPrayingDate ?? today;

  const totalDays = Math.max(0, daysBetween(bulughDate, endDate));

  // Step 4 — female only. Nifas is not estimated; the spec leaves that to a
  // manual lump sum.
  const excludedDays =
    profile.gender === "female"
      ? Math.floor((totalDays / 30) * profile.menstruationAvgDaysPerMonth)
      : 0;

  const qazaDays = Math.max(0, totalDays - excludedDays);

  return {
    bulughDate,
    endDate,
    totalDays,
    excludedDays,
    qazaDays,
    perPrayer: qazaDays,
    totalPrayers: qazaDays * 5,
    stillAccumulating,
  };
}
