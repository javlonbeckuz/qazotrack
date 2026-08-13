/**
 * Where the sun actually is.
 *
 * The app used to assume sunrise at 05:00 and sunset at 21:00 everywhere, all
 * year, so the "Asr time" line and the day/night theme were decoration rather
 * than fact. These are the standard low-precision formulae (Meeus, chapters 12,
 * 13 and 25) — good to well under a minute for prayer times, which is far
 * inside the tolerance anyone reads them at.
 *
 * `date` is always a parameter. Nothing here reads the clock, so every function
 * is deterministic and testable.
 */

export type Coordinates = { latitude: number; longitude: number };

/** Tashkent. Used when a reader declines the location prompt. */
export const FALLBACK_COORDINATES: Coordinates = { latitude: 41.2995, longitude: 69.2401 };

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const DAY_MS = 86400000;
/** Days from the Unix epoch back to J2000.0 (2000-01-01 12:00 TT). */
const J2000_OFFSET = 10957.5;

/** Days since J2000.0, the epoch every element below is referred to. */
export function daysSinceEpoch(date: Date): number {
  return date.getTime() / DAY_MS - J2000_OFFSET;
}

const normaliseDegrees = (value: number) => ((value % 360) + 360) % 360;

/**
 * The sun in ecliptic coordinates, then equatorial.
 *
 * The orbit is treated as a slightly eccentric ellipse via the equation of the
 * centre; the two-term series is what keeps this accurate to ~0.01°.
 */
function sunPosition(days: number) {
  const meanAnomaly = normaliseDegrees(357.5291 + 0.98560028 * days);
  const centre =
    1.9148 * Math.sin(meanAnomaly * RAD) +
    0.02 * Math.sin(2 * meanAnomaly * RAD) +
    0.0003 * Math.sin(3 * meanAnomaly * RAD);
  const eclipticLongitude = normaliseDegrees(meanAnomaly + centre + 180 + 102.9372);
  const obliquity = 23.4393 - 0.0000004 * days;

  const declination =
    Math.asin(Math.sin(obliquity * RAD) * Math.sin(eclipticLongitude * RAD)) * DEG;
  const rightAscension =
    Math.atan2(
      Math.cos(obliquity * RAD) * Math.sin(eclipticLongitude * RAD),
      Math.cos(eclipticLongitude * RAD),
    ) * DEG;

  return { meanAnomaly, centre, eclipticLongitude, declination, rightAscension };
}

/** Greenwich mean sidereal time, in degrees. */
function siderealTime(days: number, longitude: number) {
  return normaliseDegrees(280.16 + 360.9856235 * days + longitude);
}

export type SunPosition = {
  /** Degrees above the horizon. Negative when the sun has set. */
  altitude: number;
  /** Degrees clockwise from true north: 90 is due east, 270 due west. */
  azimuth: number;
  declination: number;
};

/** Where the sun sits in the sky, for one place at one instant. */
export function sunPositionAt(date: Date, { latitude, longitude }: Coordinates): SunPosition {
  const days = daysSinceEpoch(date);
  const { declination, rightAscension } = sunPosition(days);
  const hourAngle = (siderealTime(days, longitude) - rightAscension) * RAD;
  const lat = latitude * RAD;
  const dec = declination * RAD;

  const altitude =
    Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hourAngle)) *
    DEG;
  // Measured from north rather than south, so the value reads the way a compass
  // bearing does.
  const azimuth =
    normaliseDegrees(
      Math.atan2(
        Math.sin(hourAngle),
        Math.cos(hourAngle) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat),
      ) *
        DEG +
        180,
    );

  return { altitude, azimuth, declination };
}

/**
 * The instant on `date` when the sun reaches `altitude`, in the given half of
 * the day. Returns null when it never does — a polar summer has no sunset, and
 * at high latitudes the sun can fail to reach the Fajr and Isha angles at all.
 */
function timeAtAltitude(
  date: Date,
  { latitude, longitude }: Coordinates,
  altitude: number,
  side: "rising" | "setting",
): Date | null {
  const noon = solarNoon(date, { latitude, longitude });
  const { declination } = sunPositionAt(noon, { latitude, longitude });
  const lat = latitude * RAD;
  const dec = declination * RAD;

  const cosHourAngle =
    (Math.sin(altitude * RAD) - Math.sin(lat) * Math.sin(dec)) / (Math.cos(lat) * Math.cos(dec));
  if (cosHourAngle > 1 || cosHourAngle < -1) return null;

  const offsetMs = (Math.acos(cosHourAngle) * DEG / 15) * 3600000;
  return new Date(noon.getTime() + (side === "rising" ? -offsetMs : offsetMs));
}

/**
 * Local solar noon — when the sun crosses the meridian, which is not 12:00.
 *
 * Solved by iteration rather than by the equation of time directly: two passes
 * converge to well under a second and the code stays readable.
 */
export function solarNoon(date: Date, { latitude, longitude }: Coordinates): Date {
  let guess = new Date(date);
  guess.setHours(12, 0, 0, 0);
  for (let pass = 0; pass < 3; pass += 1) {
    const days = daysSinceEpoch(guess);
    const { rightAscension } = sunPosition(days);
    // How far past the meridian the sun already is, as an angle.
    let error = siderealTime(days, longitude) - rightAscension;
    if (error > 180) error -= 360;
    if (error < -180) error += 360;
    guess = new Date(guess.getTime() - (error / 15) * 3600000);
  }
  void latitude;
  return guess;
}

/**
 * Sun altitude at which Asr begins.
 *
 * `shadowFactor` is the length of an object's shadow, in object-lengths, added
 * to its shadow at noon. 1 is the Shafi'i, Maliki and Hanbali position; 2 is
 * the Hanafi one. This app takes 12 and 9 lunar years for maturity — the Hanafi
 * figures — so it takes the Hanafi shadow too, and stays internally consistent.
 */
const ASR_SHADOW_FACTOR = 2;

function asrAltitude(date: Date, coordinates: Coordinates) {
  const { declination } = sunPositionAt(solarNoon(date, coordinates), coordinates);
  const noonZenith = Math.abs(coordinates.latitude - declination) * RAD;
  return Math.atan(1 / (ASR_SHADOW_FACTOR + Math.tan(noonZenith))) * DEG;
}

/** Sun centre this far below the horizon; refraction and the disc's radius. */
const HORIZON = -0.833;
/** Muslim World League twilight angles. */
const FAJR_ANGLE = -18;
const ISHA_ANGLE = -17;

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export type PrayerTimes = Record<PrayerKey, Date | null> & {
  sunrise: Date | null;
  sunset: Date | null;
};

/** The five prayer times for one place on one day, from solar angles. */
export function prayerTimesFor(date: Date, coordinates: Coordinates): PrayerTimes {
  return {
    fajr: timeAtAltitude(date, coordinates, FAJR_ANGLE, "rising"),
    sunrise: timeAtAltitude(date, coordinates, HORIZON, "rising"),
    dhuhr: solarNoon(date, coordinates),
    asr: timeAtAltitude(date, coordinates, asrAltitude(date, coordinates), "setting"),
    maghrib: timeAtAltitude(date, coordinates, HORIZON, "setting"),
    sunset: timeAtAltitude(date, coordinates, HORIZON, "setting"),
    isha: timeAtAltitude(date, coordinates, ISHA_ANGLE, "setting"),
  };
}

/** Which prayer's window `date` falls in, and how far the sun is through its day. */
export function currentPrayer(date: Date, coordinates: Coordinates) {
  const times = prayerTimesFor(date, coordinates);
  const order: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

  // Before Fajr belongs to the previous night's Isha, not to nothing.
  let current: PrayerKey = "isha";
  for (const key of order) {
    const at = times[key];
    if (at && date.getTime() >= at.getTime()) current = key;
  }

  const { altitude } = sunPositionAt(date, coordinates);
  const isNight = altitude < HORIZON;

  // Fraction of the day between sunrise and sunset, for the arc marker. Falls
  // back to a flat half when the sun never rises or never sets.
  let progress = 0.5;
  if (times.sunrise && times.sunset) {
    const span = times.sunset.getTime() - times.sunrise.getTime();
    if (span > 0) {
      progress = Math.max(0, Math.min(1, (date.getTime() - times.sunrise.getTime()) / span));
    }
  }

  return { current, times, isNight, progress, altitude };
}

/**
 * Heliocentric longitude of the inner planets, in degrees.
 *
 * Mean elements only — no perturbations — which is a degree or so out over a
 * century. The orrery reads as motion, not as an ephemeris, and this keeps the
 * relative rates and the current positions honest.
 */
export const PLANETS = [
  { key: "mercury", longitudeAtEpoch: 252.25, degreesPerDay: 4.09233445, radiusAu: 0.387 },
  { key: "venus", longitudeAtEpoch: 181.98, degreesPerDay: 1.60213034, radiusAu: 0.723 },
  { key: "earth", longitudeAtEpoch: 100.46, degreesPerDay: 0.98560028, radiusAu: 1 },
] as const;

export type PlanetKey = (typeof PLANETS)[number]["key"];

export function planetLongitude(key: PlanetKey, date: Date): number {
  const planet = PLANETS.find((item) => item.key === key)!;
  return normaliseDegrees(planet.longitudeAtEpoch + planet.degreesPerDay * daysSinceEpoch(date));
}
