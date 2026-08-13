import { describe, expect, it } from "vitest";
import {
  FALLBACK_COORDINATES,
  currentPrayer,
  planetLongitude,
  prayerTimesFor,
  solarNoon,
  sunPositionAt,
} from "./solar";

/** Greenwich, so UTC and local solar time differ only by the equation of time. */
const GREENWICH = { latitude: 51.4779, longitude: 0 };
const TASHKENT = FALLBACK_COORDINATES;

const minutesUtc = (date: Date) => date.getUTCHours() * 60 + date.getUTCMinutes();

describe("sun position", () => {
  it("puts the sun near the equator at the March equinox", () => {
    // Declination passes through zero at the equinox, by definition.
    const { declination } = sunPositionAt(new Date("2026-03-20T12:00:00Z"), GREENWICH);
    expect(Math.abs(declination)).toBeLessThan(0.5);
  });

  it("reaches maximum declination at the June solstice", () => {
    const { declination } = sunPositionAt(new Date("2026-06-21T12:00:00Z"), GREENWICH);
    expect(declination).toBeGreaterThan(23);
    expect(declination).toBeLessThan(23.5);
  });

  it("reaches minimum declination at the December solstice", () => {
    const { declination } = sunPositionAt(new Date("2026-12-21T12:00:00Z"), GREENWICH);
    expect(declination).toBeLessThan(-23);
    expect(declination).toBeGreaterThan(-23.5);
  });

  it("places the sun due south at local noon in the northern hemisphere", () => {
    const noon = solarNoon(new Date("2026-06-21T12:00:00Z"), GREENWICH);
    const { azimuth, altitude } = sunPositionAt(noon, GREENWICH);
    expect(Math.abs(azimuth - 180)).toBeLessThan(1);
    // Highest the sun gets at this latitude: 90 - 51.48 + 23.4.
    expect(altitude).toBeGreaterThan(61);
    expect(altitude).toBeLessThan(63);
  });

  it("puts the sun below the horizon at midnight", () => {
    const { altitude } = sunPositionAt(new Date("2026-06-21T00:00:00Z"), GREENWICH);
    expect(altitude).toBeLessThan(0);
  });
});

describe("prayer times", () => {
  it("orders the day correctly in Tashkent", () => {
    const times = prayerTimesFor(new Date("2026-08-13T09:00:00Z"), TASHKENT);
    const ordered = [times.fajr!, times.sunrise!, times.dhuhr, times.asr!, times.maghrib!, times.isha!];
    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index].getTime()).toBeGreaterThan(ordered[index - 1].getTime());
    }
  });

  it("matches Tashkent sunrise and sunset to within a couple of minutes", () => {
    // 13 August 2026, Tashkent (41.3N, 69.24E, UTC+5). Declination is +14.3, so
    // the half-day is 6h56m either side of a solar noon at 07:28 UTC: sunrise
    // 00:32 UTC and sunset 14:24 UTC, or 05:32 and 19:24 local. That is a day
    // length of 13h52m, which is what mid-August at this latitude gives.
    const times = prayerTimesFor(new Date("2026-08-13T09:00:00Z"), TASHKENT);
    expect(Math.abs(minutesUtc(times.sunrise!) - 32)).toBeLessThanOrEqual(3);
    expect(Math.abs(minutesUtc(times.sunset!) - (14 * 60 + 24))).toBeLessThanOrEqual(3);

    const dayLengthMinutes = (times.sunset!.getTime() - times.sunrise!.getTime()) / 60000;
    expect(Math.abs(dayLengthMinutes - (13 * 60 + 52))).toBeLessThanOrEqual(6);
  });

  it("puts solar noon halfway between sunrise and sunset", () => {
    const times = prayerTimesFor(new Date("2026-08-13T09:00:00Z"), TASHKENT);
    const midpoint = (times.sunrise!.getTime() + times.sunset!.getTime()) / 2;
    expect(Math.abs(times.dhuhr.getTime() - midpoint)).toBeLessThan(60000);
  });

  it("returns null for twilight that never arrives in a polar summer", () => {
    // Tromsø in June: the sun never reaches 18 degrees below the horizon.
    const times = prayerTimesFor(new Date("2026-06-21T12:00:00Z"), { latitude: 69.65, longitude: 18.96 });
    expect(times.fajr).toBeNull();
    expect(times.sunset).toBeNull();
  });
});

describe("current prayer", () => {
  it("reports night before dawn and day at noon", () => {
    const before = currentPrayer(new Date("2026-08-13T00:00:00Z"), TASHKENT);
    expect(before.isNight).toBe(true);

    const midday = currentPrayer(new Date("2026-08-13T07:30:00Z"), TASHKENT);
    expect(midday.isNight).toBe(false);
    expect(midday.current).toBe("dhuhr");
  });

  it("carries Isha across midnight rather than reporting nothing", () => {
    // 02:00 local is before Fajr, so it still belongs to Isha.
    const { current } = currentPrayer(new Date("2026-08-12T21:00:00Z"), TASHKENT);
    expect(current).toBe("isha");
  });

  it("keeps progress between 0 and 1 across the whole day", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      const { progress } = currentPrayer(new Date(Date.UTC(2026, 7, 13, hour)), TASHKENT);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });
});

describe("planets", () => {
  it("advances each planet by one full turn over its own year", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    const periods = { mercury: 87.969, venus: 224.701, earth: 365.256 } as const;
    for (const [key, days] of Object.entries(periods)) {
      const later = new Date(start.getTime() + days * 86400000);
      const drift = Math.abs(
        planetLongitude(key as keyof typeof periods, later) -
          planetLongitude(key as keyof typeof periods, start),
      );
      expect(Math.min(drift, 360 - drift)).toBeLessThan(1);
    }
  });

  it("moves the inner planets faster than the outer ones", () => {
    const a = new Date("2026-01-01T00:00:00Z");
    const b = new Date("2026-01-11T00:00:00Z");
    const travelled = (key: "mercury" | "venus" | "earth") => {
      const delta = planetLongitude(key, b) - planetLongitude(key, a);
      return ((delta % 360) + 360) % 360;
    };
    expect(travelled("mercury")).toBeGreaterThan(travelled("venus"));
    expect(travelled("venus")).toBeGreaterThan(travelled("earth"));
  });
});
