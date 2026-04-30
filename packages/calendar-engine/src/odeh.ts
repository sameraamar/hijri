/**
 * Odeh (2004) criterion for predicting first crescent visibility.
 *
 * Reference: Mohammad Sh. Odeh, "New Criterion for Lunar Crescent Visibility,"
 * Experimental Astronomy, Vol. 18, pp. 39–64, 2004.
 *
 * The criterion evaluates crescent visibility at the "best time" after sunset
 * using a V-value derived from ARCV and topocentric crescent width W',
 * classifying the result into 4 zones (A–D).
 *
 * V = ARCV − (−0.1018·W'³ + 0.7319·W'² − 6.3226·W' + 7.1651)
 *
 * Unlike Yallop, V is NOT divided by 10, and uses constant 7.1651 instead of 11.8371.
 * Danjon limit is 6.4° (vs Yallop's 7°).
 */

import * as Astronomy from 'astronomy-engine';

import type { GregorianDate } from './types.js';
import type { ObserverLocation, MonthStartEstimate, MonthStartLikelihood } from './monthStartEstimate.js';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export type OdehZone = 'A' | 'B' | 'C' | 'D';

export type OdehResult = {
  /** The V value from the Odeh polynomial. */
  v: number;
  /** Visibility zone A–D. */
  zone: OdehZone;
  /** Zone description. */
  zoneDescription: string;
  /** Topocentric crescent width W' (arcminutes). */
  crescentWidthArcmin: number;
  /** Arc of vision ARCV (degrees) — moon altitude difference from sun altitude at best time. */
  arcvDeg: number;
  /** Arc of light ARCL (degrees) — geocentric elongation at best time. */
  arclDeg: number;
  /** Best time for observation (UTC ISO string). */
  bestTimeUtcIso: string;
  /** Sunset time (UTC ISO string). */
  sunsetUtcIso: string;
  /** Lag time in minutes (moonset − sunset). */
  lagMinutes: number;
  /** Moon altitude at best time (degrees). */
  moonAltitudeDeg: number;
  /** Sun altitude at best time (degrees). */
  sunAltitudeDeg: number;
  /** Moon age in hours at best time. */
  moonAgeHours: number;
  /** Moon illumination fraction at best time. */
  moonIlluminationFraction: number;
};

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const SYNODIC_MONTH_DAYS = 29.530588853;

/** Moon's mean semi-diameter in degrees, per Yallop (same physics). */
const SD_FACTOR = 0.27245;

/** Odeh Danjon limit (degrees). */
const DANJON_LIMIT = 6.4;

// V-zone boundaries (from Odeh 2004, Table 1):
const V_ZONE_A = 5.65;   // Crescent visible by naked eye
const V_ZONE_B = 2.0;    // Crescent visible by optical aid and could be seen by naked eye
const V_ZONE_C = -0.96;  // Crescent visible by optical aid only

const ZONE_DESCRIPTIONS: Record<OdehZone, string> = {
  A: 'Visible by naked eye',
  B: 'Visible by optical aid; may be seen by naked eye',
  C: 'Visible by optical aid only',
  D: 'Not visible even with optical aid',
};

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function safeIso(d: Date): string | undefined {
  const t = d.getTime();
  if (!Number.isFinite(t)) return undefined;
  return d.toISOString();
}

function safeIsoTime(t: Astronomy.AstroTime | null | undefined): string | undefined {
  if (!t) return undefined;
  return safeIso(t.date);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

// ---------------------------------------------------------------------------
//  Core Algorithm
// ---------------------------------------------------------------------------

/**
 * Classify V into Odeh zone.
 */
function classifyZone(v: number, arclDeg: number): OdehZone {
  // Below Danjon limit → not visible
  if (arclDeg < DANJON_LIMIT) return 'D';
  if (v >= V_ZONE_A) return 'A';
  if (v >= V_ZONE_B) return 'B';
  if (v >= V_ZONE_C) return 'C';
  return 'D';
}

/**
 * Map Odeh zone to the app's unified 5-label MonthStartLikelihood.
 *
 * A → high   (visible by naked eye)
 * B → high   (optical aid / possible naked eye)
 * C → medium (optical aid only — still valid for Islamic sighting per many scholars)
 * D → low    (not visible)
 */
function zoneToLikelihood(zone: OdehZone): MonthStartLikelihood {
  switch (zone) {
    case 'A': return 'high';
    case 'B': return 'high';
    case 'C': return 'medium';
    case 'D': return 'low';
  }
}

/**
 * Map Odeh zone to a visibility percentage for UI display.
 */
function zoneToVisibilityPercent(zone: OdehZone): number {
  switch (zone) {
    case 'A': return 95;
    case 'B': return 75;
    case 'C': return 45;
    case 'D': return 0;
  }
}

/**
 * Compute the Odeh V-test for a given date and observer location.
 *
 * Returns null if sunset cannot be found (polar regions).
 */
export function computeOdehVTest(
  date: GregorianDate,
  location: ObserverLocation
): OdehResult | null {
  const startOfDayUtc = new Date(Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0));
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);

  // 1. Find sunset
  const sunsetTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, startOfDayUtc, 2);
  if (!sunsetTime) return null;
  const sunset = sunsetTime.date;
  const sunsetIso = safeIso(sunset);
  if (!sunsetIso) return null;

  // 2. Compute moonset to get lag time
  const moonEqAtSunset = Astronomy.Equator(Astronomy.Body.Moon, sunset, observer, true, true);
  const moonHorAtSunset = Astronomy.Horizon(sunset, observer, moonEqAtSunset.ra, moonEqAtSunset.dec, 'normal');
  const nextMoonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, sunset, 2);
  const prevMoonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, sunset, -2);
  const moonsetTime = moonHorAtSunset.altitude > 0
    ? (nextMoonset ?? prevMoonset)
    : (prevMoonset ?? nextMoonset);
  const lagMinutes = moonsetTime
    ? (moonsetTime.date.getTime() - sunset.getTime()) / 60000
    : 0;

  // 3. Compute best time: Tb = Ts + (4/9) × Lag  (same as Yallop)
  const lagMs = lagMinutes * 60000;
  const bestTimeMs = sunset.getTime() + (4 / 9) * lagMs;
  const bestTime = new Date(bestTimeMs);
  const bestTimeIso = safeIso(bestTime);
  if (!bestTimeIso) return null;

  // 4. Compute sun and moon positions at best time
  const sunEqBest = Astronomy.Equator(Astronomy.Body.Sun, bestTime, observer, true, true);
  const sunHorBest = Astronomy.Horizon(bestTime, observer, sunEqBest.ra, sunEqBest.dec, 'normal');

  const moonEqBest = Astronomy.Equator(Astronomy.Body.Moon, bestTime, observer, true, true);
  const moonHorBest = Astronomy.Horizon(bestTime, observer, moonEqBest.ra, moonEqBest.dec, 'normal');

  // 5. Compute ARCV (arc of vision)
  const arcvDeg = moonHorBest.altitude - sunHorBest.altitude;

  // 6. Compute ARCL (arc of light): geocentric elongation at best time
  const moonGeoBest = Astronomy.GeoVector(Astronomy.Body.Moon, bestTime, true);
  const sunGeoBest = Astronomy.GeoVector(Astronomy.Body.Sun, bestTime, true);
  const arclDeg = Astronomy.AngleBetween(moonGeoBest, sunGeoBest);

  // 7. Moon parallax at best time
  const AU_KM = 149597870.7;
  const EARTH_RADIUS_KM = 6378.14;
  const moonDistKm = moonEqBest.dist * AU_KM;
  const moonParallaxRad = Math.asin(EARTH_RADIUS_KM / moonDistKm);
  const moonParallaxDeg = toDegrees(moonParallaxRad);

  // 8. Semi-diameter and topocentric crescent width
  const sdDeg = SD_FACTOR * moonParallaxDeg;
  const hRad = toRadians(moonHorBest.altitude);
  const sdPrimeDeg = sdDeg * (1 + Math.sin(hRad) * Math.sin(moonParallaxRad));
  const arclRad = toRadians(arclDeg);
  const crescentWidthDeg = sdPrimeDeg * (1 - Math.cos(arclRad));
  const crescentWidthArcmin = crescentWidthDeg * 60;

  // 9. The Odeh V polynomial
  //    V = ARCV − (−0.1018·W'³ + 0.7319·W'² − 6.3226·W' + 7.1651)
  //    Note: NOT divided by 10 (unlike Yallop's q), and constant is 7.1651 (not 11.8371)
  const wPrime = crescentWidthArcmin;
  const polynomial = -0.1018 * wPrime * wPrime * wPrime
    + 0.7319 * wPrime * wPrime
    - 6.3226 * wPrime
    + 7.1651;
  const v = arcvDeg - polynomial;

  // 10. Zone classification
  const zone = classifyZone(v, arclDeg);

  // 11. Moon age and illumination
  const prevConjunction = Astronomy.SearchMoonPhase(0, bestTime, -40);
  const phaseDeg = Astronomy.MoonPhase(bestTime);
  const phase = phaseDeg / 360;
  const moonAgeHours = prevConjunction
    ? (bestTime.getTime() - prevConjunction.date.getTime()) / 3600000
    : phase * SYNODIC_MONTH_DAYS * 24;

  const illum = Astronomy.Illumination(Astronomy.Body.Moon, bestTime);
  const moonIlluminationFraction = illum.phase_fraction;

  return {
    v,
    zone,
    zoneDescription: ZONE_DESCRIPTIONS[zone],
    crescentWidthArcmin,
    arcvDeg,
    arclDeg,
    bestTimeUtcIso: bestTimeIso,
    sunsetUtcIso: sunsetIso,
    lagMinutes,
    moonAltitudeDeg: moonHorBest.altitude,
    sunAltitudeDeg: sunHorBest.altitude,
    moonAgeHours,
    moonIlluminationFraction,
  };
}

// ---------------------------------------------------------------------------
//  Integration with existing engine types
// ---------------------------------------------------------------------------

const MAX_CRESCENT_AGE_HOURS = 72;

/**
 * Compute a MonthStartEstimate using the Odeh V-test.
 *
 * This function has the same signature style as `estimateMonthStartLikelihoodAtSunset`
 * so it can be swapped in by the UI.
 */
export function odehMonthStartEstimate(
  date: GregorianDate,
  location: ObserverLocation
): MonthStartEstimate {
  const startOfDayUtc = new Date(Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0));
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);

  // Sunrise/moonrise for UI context
  const sunriseTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, startOfDayUtc, 2);
  const moonriseTime = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, startOfDayUtc, 2);
  const sunriseIso = safeIsoTime(sunriseTime);
  const moonriseIso = safeIsoTime(moonriseTime);

  const result = computeOdehVTest(date, location);
  if (!result) {
    return { kind: 'odeh', likelihood: 'unknown', metrics: {} };
  }

  // Check moon age at sunset — if too old, this isn't a new-month crescent
  const sunsetTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, startOfDayUtc, 2);
  const sunset = sunsetTime?.date;
  const prevConjunction = sunset ? Astronomy.SearchMoonPhase(0, sunset, -40) : null;
  const moonAgeAtSunset = (prevConjunction && sunset)
    ? (sunset.getTime() - prevConjunction.date.getTime()) / 3600000
    : result.moonAgeHours;
  const phaseDeg = sunset ? Astronomy.MoonPhase(sunset) : 0;
  const phase = phaseDeg / 360;

  // Not near new moon → not relevant for month start
  if (moonAgeAtSunset > MAX_CRESCENT_AGE_HOURS || phase > 0.5) {
    return {
      kind: 'odeh',
      likelihood: 'low',
      metrics: {
        sunriseUtcIso: sunriseIso,
        sunsetUtcIso: result.sunsetUtcIso,
        moonriseUtcIso: moonriseIso,
        moonsetUtcIso: undefined,
        lagMinutes: result.lagMinutes,
        moonAltitudeDeg: result.moonAltitudeDeg,
        moonElongationDeg: result.arclDeg,
        moonAgeHours: result.moonAgeHours,
        moonIlluminationFraction: result.moonIlluminationFraction,
        moonPhase: phase,
        visibilityScore: 0,
        visibilityPercent: 0,
      },
    };
  }

  const likelihood = zoneToLikelihood(result.zone);
  const visibilityPercent = zoneToVisibilityPercent(result.zone);
  const visibilityScore = clamp01(visibilityPercent / 100);

  // Compute moonset ISO for UI
  const moonEqAtSunset = sunset ? Astronomy.Equator(Astronomy.Body.Moon, sunset, observer, true, true) : null;
  const moonHorAtSunset = (sunset && moonEqAtSunset)
    ? Astronomy.Horizon(sunset, observer, moonEqAtSunset.ra, moonEqAtSunset.dec, 'normal')
    : null;
  let moonsetIso: string | undefined;
  if (sunset) {
    const nextMs = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, sunset, 2);
    const prevMs = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, sunset, -2);
    const ms = (moonHorAtSunset && moonHorAtSunset.altitude > 0)
      ? (nextMs ?? prevMs)
      : (prevMs ?? nextMs);
    moonsetIso = safeIsoTime(ms);
  }

  // Sun/moon at sunset for the metrics
  let moonAzimuthDeg: number | undefined;
  let sunAltitudeDeg: number | undefined;
  let sunAzimuthDeg: number | undefined;
  let relativeAzimuthDeg: number | undefined;
  if (sunset) {
    const sunEq = Astronomy.Equator(Astronomy.Body.Sun, sunset, observer, true, true);
    const sunHor = Astronomy.Horizon(sunset, observer, sunEq.ra, sunEq.dec, 'normal');
    sunAltitudeDeg = sunHor.altitude;
    sunAzimuthDeg = sunHor.azimuth;

    const moonEq = Astronomy.Equator(Astronomy.Body.Moon, sunset, observer, true, true);
    const moonHor = Astronomy.Horizon(sunset, observer, moonEq.ra, moonEq.dec, 'normal');
    moonAzimuthDeg = moonHor.azimuth;
    relativeAzimuthDeg = ((moonHor.azimuth - sunHor.azimuth + 180) % 360 + 360) % 360 - 180;
  }

  return {
    kind: 'odeh',
    likelihood,
    metrics: {
      sunriseUtcIso: sunriseIso,
      sunsetUtcIso: result.sunsetUtcIso,
      moonriseUtcIso: moonriseIso,
      moonsetUtcIso: moonsetIso,
      lagMinutes: result.lagMinutes,
      moonAltitudeDeg: result.moonAltitudeDeg,
      moonAzimuthDeg,
      sunAltitudeDeg,
      sunAzimuthDeg,
      relativeAzimuthDeg,
      moonElongationDeg: result.arclDeg,
      moonAgeHours: result.moonAgeHours,
      moonIlluminationFraction: result.moonIlluminationFraction,
      moonPhase: phase,
      visibilityScore,
      visibilityPercent,
      // Odeh-specific details
      odehV: result.v,
      odehZone: result.zone,
      odehZoneDescription: result.zoneDescription,
      odehBestTimeUtcIso: result.bestTimeUtcIso,
      odehArclDeg: result.arclDeg,
      odehArcvDeg: result.arcvDeg,
      odehWidthArcmin: result.crescentWidthArcmin,
    },
  };
}

/**
 * Check if crescent meets Odeh visibility criteria for month start.
 *
 * Uses zones A–C as "visible" (naked eye or with optical aid).
 */
export function meetsOdehCriteriaAtSunset(
  est: MonthStartEstimate
): boolean {
  // Use the visibilityPercent which maps from zone:
  // A=95, B=75 → High (naked-eye / optical possible)
  // C=45 → Fair (optical aid — accepted by many scholars)
  // D=0 → below threshold
  const percent = est.metrics.visibilityPercent ?? 0;
  return percent >= 45; // Zones A, B, C
}
