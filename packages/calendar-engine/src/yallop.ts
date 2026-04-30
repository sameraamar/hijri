/**
 * Yallop (1997) q-test for predicting first crescent visibility.
 *
 * Reference: B.D. Yallop, "A Method for Predicting the First Sighting of
 * the New Crescent Moon," RGO NAO Technical Note No. 69, 1997.
 *
 * The q-test evaluates crescent visibility at the "best time" after sunset
 * and classifies the result into 6 zones (A–F).
 */

import * as Astronomy from 'astronomy-engine';

import type { GregorianDate } from './types.js';
import type { ObserverLocation, MonthStartEstimate, MonthStartLikelihood } from './monthStartEstimate.js';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export type YallopZone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export type YallopResult = {
  /** The q value from the Yallop polynomial. */
  q: number;
  /** Visibility zone A–F. */
  zone: YallopZone;
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

/** Moon's mean semi-diameter in degrees, per Yallop. */
const SD_FACTOR = 0.27245; // degrees per unit of parallax (in degrees)

// q-zone boundaries (Table from Yallop 1997):
const Q_ZONE_A = 0.216;  // Easily visible
const Q_ZONE_B = -0.014; // Visible under perfect conditions
const Q_ZONE_C = -0.160; // May need optical aid to find
const Q_ZONE_D = -0.232; // Will need optical aid to find
const Q_ZONE_E = -0.293; // Not visible with telescope

const ZONE_DESCRIPTIONS: Record<YallopZone, string> = {
  A: 'Easily visible to the naked eye',
  B: 'Visible under perfect conditions',
  C: 'May need optical aid to find crescent',
  D: 'Will need optical aid to find crescent',
  E: 'Not visible with a telescope',
  F: 'Not visible: below Danjon limit',
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
 * Classify q into Yallop zone.
 */
function classifyZone(q: number): YallopZone {
  if (q > Q_ZONE_A) return 'A';
  if (q > Q_ZONE_B) return 'B';
  if (q > Q_ZONE_C) return 'C';
  if (q > Q_ZONE_D) return 'D';
  if (q > Q_ZONE_E) return 'E';
  return 'F';
}

/**
 * Map Yallop zone to the app's unified 5-label MonthStartLikelihood.
 *
 * A → high  (easily visible naked eye)
 * B → high  (visible under perfect conditions — still naked-eye)
 * C → medium/Fair  (may need optical aid to find — naked-eye possible)
 * D → medium/Fair  (will need optical aid — valid for Islamic sighting)
 * E → low/Faint  (not visible even with telescope)
 * F → low/None  (below Danjon limit)
 */
function zoneToLikelihood(zone: YallopZone): MonthStartLikelihood {
  switch (zone) {
    case 'A': return 'high';
    case 'B': return 'high';
    case 'C': return 'medium';
    case 'D': return 'medium';
    case 'E': return 'low';
    case 'F': return 'low';
  }
}

/**
 * Map Yallop zone to a visibility percentage for UI display.
 */
function zoneToVisibilityPercent(zone: YallopZone): number {
  switch (zone) {
    case 'A': return 95;
    case 'B': return 80;
    case 'C': return 55;
    case 'D': return 40;
    case 'E': return 10;
    case 'F': return 0;
  }
}

/**
 * Compute the Yallop q-test for a given date and observer location.
 *
 * Returns null if sunset cannot be found (polar regions).
 */
export function computeYallopQTest(
  date: GregorianDate,
  location: ObserverLocation
): YallopResult | null {
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

  // 3. Compute best time: Tb = Ts + (4/9) × Lag
  //    Yallop defines "best time" as 4/9 of the way between sunset and moonset.
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

  // 5. Compute ARCV (arc of vision): difference in altitude between moon and sun
  const arcvDeg = moonHorBest.altitude - sunHorBest.altitude;

  // 6. Compute ARCL (arc of light): geocentric elongation at best time
  const moonGeoBest = Astronomy.GeoVector(Astronomy.Body.Moon, bestTime, true);
  const sunGeoBest = Astronomy.GeoVector(Astronomy.Body.Sun, bestTime, true);
  const arclDeg = Astronomy.AngleBetween(moonGeoBest, sunGeoBest);

  // 7. Moon parallax at best time
  //    astronomy-engine's Equator() with ofdate=true, aberration=true gives us the
  //    distance. Moon parallax π ≈ asin(6378.14 / dist_km).
  //    moonEqBest.dist is in AU. Convert to km.
  const AU_KM = 149597870.7;
  const EARTH_RADIUS_KM = 6378.14;
  const moonDistKm = moonEqBest.dist * AU_KM;
  const moonParallaxRad = Math.asin(EARTH_RADIUS_KM / moonDistKm);
  const moonParallaxDeg = toDegrees(moonParallaxRad);

  // 8. Semi-diameter and topocentric crescent width
  //    SD = 0.27245 × π (both in degrees)
  const sdDeg = SD_FACTOR * moonParallaxDeg;

  //    SD' = SD × (1 + sin(h) × sin(π))
  //    where h = moon altitude at best time, π = moon parallax
  const hRad = toRadians(moonHorBest.altitude);
  const sdPrimeDeg = sdDeg * (1 + Math.sin(hRad) * Math.sin(moonParallaxRad));

  //    W' = SD' × (1 − cos(ARCL))  — result in arcminutes
  const arclRad = toRadians(arclDeg);
  const crescentWidthDeg = sdPrimeDeg * (1 - Math.cos(arclRad));
  const crescentWidthArcmin = crescentWidthDeg * 60;

  // 9. The q-test polynomial
  //    q = (ARCV − (11.8371 − 6.3226·W' + 0.7319·W'² − 0.1018·W'³)) / 10
  const wPrime = crescentWidthArcmin;
  const polynomial = 11.8371
    - 6.3226 * wPrime
    + 0.7319 * wPrime * wPrime
    - 0.1018 * wPrime * wPrime * wPrime;
  const q = (arcvDeg - polynomial) / 10;

  // 10. Zone classification
  const zone = classifyZone(q);

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
    q,
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
 * Compute a MonthStartEstimate using the Yallop q-test.
 *
 * This function has the same signature style as `estimateMonthStartLikelihoodAtSunset`
 * so it can be swapped in by the UI.
 */
export function yallopMonthStartEstimate(
  date: GregorianDate,
  location: ObserverLocation
): MonthStartEstimate {
  const startOfDayUtc = new Date(Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0));
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);

  // Sunrise/moonrise for UI context (same as the heuristic estimator)
  const sunriseTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, startOfDayUtc, 2);
  const moonriseTime = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, startOfDayUtc, 2);
  const sunriseIso = safeIsoTime(sunriseTime);
  const moonriseIso = safeIsoTime(moonriseTime);

  const result = computeYallopQTest(date, location);
  if (!result) {
    return { kind: 'yallop', likelihood: 'unknown', metrics: {} };
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
      kind: 'yallop',
      likelihood: 'low',
      metrics: {
        sunriseUtcIso: sunriseIso,
        sunsetUtcIso: result.sunsetUtcIso,
        moonriseUtcIso: moonriseIso,
        moonsetUtcIso: undefined, // Not critical; avoid extra search
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

  // Sun/moon at sunset for the metrics (CalendarPage shows metrics at sunset)
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
    kind: 'yallop',
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
      // Yallop-specific details
      yallopQ: result.q,
      yallopZone: result.zone,
      yallopZoneDescription: result.zoneDescription,
      yallopBestTimeUtcIso: result.bestTimeUtcIso,
      yallopArclDeg: result.arclDeg,
      yallopArcvDeg: result.arcvDeg,
      yallopWidthArcmin: result.crescentWidthArcmin,
    },
  };
}

/**
 * Check if crescent meets Yallop visibility criteria for month start.
 *
 * Uses zones A–C as "visible" (naked eye or with finder optical aid).
 */
export function meetsYallopCriteriaAtSunset(
  est: MonthStartEstimate
): boolean {
  // Use the visibilityPercent which maps from zone:
  // A=95, B=80 → High (naked-eye); C=55, D=40 → Fair (optical aid valid)
  // E=10, F=0 → below threshold
  const percent = est.metrics.visibilityPercent ?? 0;
  return percent >= 40; // Zones A, B, C, D (optical aid acceptable)
}
