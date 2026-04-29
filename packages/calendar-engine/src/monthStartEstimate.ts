import * as Astronomy from 'astronomy-engine';

import type { GregorianDate } from './types.js';

export type ObserverLocation = {
  latitude: number;
  longitude: number;
};

export type MonthStartLikelihood = 'low' | 'medium' | 'high' | 'unknown';

export type MonthStartEstimate = {
  likelihood: MonthStartLikelihood;
  metrics: {
    sunriseUtcIso?: string;
    sunsetUtcIso?: string;
    moonriseUtcIso?: string;
    moonsetUtcIso?: string;
    lagMinutes?: number;
    moonAltitudeDeg?: number;
    moonAzimuthDeg?: number;
    sunAltitudeDeg?: number;
    sunAzimuthDeg?: number;
    relativeAzimuthDeg?: number;
    moonElongationDeg?: number;
    moonAgeHours?: number;
    moonIlluminationFraction?: number;
    visibilityScore?: number; // 0..1
    visibilityPercent?: number; // 0..100
    // Yallop-specific fields (only present when method is Yallop)
    yallopQ?: number;
    yallopZone?: string; // 'A'..'F'
    yallopZoneDescription?: string;
    yallopBestTimeUtcIso?: string;
    yallopArclDeg?: number; // ARCL
    yallopArcvDeg?: number; // ARCV
    yallopWidthArcmin?: number; // W'
    // Odeh-specific fields (only present when method is Odeh)
    odehV?: number;
    odehZone?: string; // 'A'..'D'
    odehZoneDescription?: string;
    odehBestTimeUtcIso?: string;
    odehArclDeg?: number; // ARCL
    odehArcvDeg?: number; // ARCV
    odehWidthArcmin?: number; // W'
  };
};

export type MoonVisibilityLevel = 'noChance' | 'veryLow' | 'low' | 'medium' | 'high' | 'unknown';
export type MonthStartSignalLevel = 'noChance' | 'veryLow' | 'low' | 'medium' | 'high' | 'unknown';

export type DailyMonthStartSignal = {
  gregorian: GregorianDate;
  basedOnEve: GregorianDate;
  moonVisibility: MoonVisibilityLevel;
  monthStartSignal: MonthStartSignalLevel;
  monthStartPercent: number;
  rawEstimate: MonthStartEstimate;
  normalizedByPreviousDay: boolean;
};

export type CrescentVisibilityCriteria = {
  /** Moonset minus sunset, in minutes. 0 means “sets at sunset”. */
  minLagMinutes?: number;
  /** Topocentric Moon altitude (degrees) at local sunset. */
  minMoonAltitudeDeg?: number;
  /** Hours since conjunction (new moon) at local sunset. */
  minMoonAgeHours?: number;
  /** Geocentric Sun/Moon elongation (degrees) at local sunset. */
  minMoonElongationDeg?: number;
};

export function meetsCrescentVisibilityCriteriaAtSunset(
  est: MonthStartEstimate,
  criteria: CrescentVisibilityCriteria = {}
): boolean {
  const minLagMinutes = criteria.minLagMinutes ?? 0;
  const minMoonAltitudeDeg = criteria.minMoonAltitudeDeg ?? 0;
  const minMoonAgeHours = criteria.minMoonAgeHours ?? 12;
  const minMoonElongationDeg = criteria.minMoonElongationDeg ?? 6;

  const lagMinutes = est.metrics.lagMinutes;
  const moonAltitudeDeg = est.metrics.moonAltitudeDeg;
  const moonAgeHours = est.metrics.moonAgeHours;
  const moonElongationDeg = est.metrics.moonElongationDeg;

  if (
    typeof lagMinutes !== 'number' ||
    typeof moonAltitudeDeg !== 'number' ||
    typeof moonAgeHours !== 'number' ||
    typeof moonElongationDeg !== 'number'
  ) {
    return false;
  }

  return (
    lagMinutes > minLagMinutes &&
    moonAltitudeDeg > minMoonAltitudeDeg &&
    moonAgeHours >= minMoonAgeHours &&
    moonElongationDeg >= minMoonElongationDeg
  );
}

/**
 * MABIMS 2016 / "Imkanur Rukyat" criteria, adopted by Indonesia, Malaysia,
 * Brunei and Singapore. Used as a published-criterion preset in addition to
 * the heuristic estimator.
 *
 * Reference: Joint MABIMS 2016 resolution (Mudzakarah Rukyat dan Taqwim Islam).
 *
 * Thresholds:
 *   - Topocentric Moon altitude ≥ 3.0°
 *   - Geocentric elongation    ≥ 6.4°
 *   - Moon age (since conjunction) ≥ 8 hours
 *   - Lag (moonset − sunset)   > 0
 */
export const MABIMS_CRITERIA: Required<Pick<
  CrescentVisibilityCriteria,
  'minLagMinutes' | 'minMoonAltitudeDeg' | 'minMoonAgeHours' | 'minMoonElongationDeg'
>> = {
  minLagMinutes: 0,
  minMoonAltitudeDeg: 3,
  minMoonAgeHours: 8,
  minMoonElongationDeg: 6.4
};

/** True when the evening's metrics satisfy MABIMS 2016 visibility thresholds. */
export function meetsMabimsCriteriaAtSunset(est: MonthStartEstimate): boolean {
  return meetsCrescentVisibilityCriteriaAtSunset(est, MABIMS_CRITERIA);
}

const SYNODIC_MONTH_DAYS = 29.530588853;
const MAX_CRESCENT_AGE_HOURS_FOR_MONTH_START = 72;

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
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

function normalizeLinear(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) return 0;
  if (high <= low) return 0;
  return clamp01((value - low) / (high - low));
}

function wrapDeg180(d: number): number {
  // Wrap to [-180, 180)
  const x = ((d + 180) % 360 + 360) % 360;
  return x - 180;
}

/**
 * Phase A (MVP): heuristic estimate for the *evening* of a Gregorian date.
 *
 * Interpretation:
 * - We compute local sunset for the given location and date.
 * - We evaluate a simplified crescent-visibility heuristic at that sunset.
 * - The result is a *likelihood estimate*, not a religious or official determination.
 */
export function estimateMonthStartLikelihoodAtSunset(date: GregorianDate, location: ObserverLocation): MonthStartEstimate {
  const startOfDayUtc = new Date(Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0));
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);

  // Extra context (useful for the UI): sunrise/moonrise for this UTC-anchored day.
  const sunriseTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, startOfDayUtc, 2);
  const moonriseTime = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, +1, startOfDayUtc, 2);
  const sunriseIso = safeIsoTime(sunriseTime);
  const moonriseIso = safeIsoTime(moonriseTime);

  // Search for the sunset that occurs after the start of the UTC day.
  // Using a UTC day anchor keeps results stable regardless of device timezone.
  const sunsetTime = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, startOfDayUtc, 2);
  const sunset = sunsetTime?.date;
  if (!sunset) return { likelihood: 'unknown', metrics: {} };

  const sunsetIso = safeIso(sunset);
  if (!sunsetIso) return { likelihood: 'unknown', metrics: {} };

  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, sunset, observer, true, true);
  const sunHor = Astronomy.Horizon(sunset, observer, sunEq.ra, sunEq.dec, 'normal');
  const sunAltitudeDeg = sunHor.altitude;
  const sunAzimuthDeg = sunHor.azimuth;

  const moonEq = Astronomy.Equator(Astronomy.Body.Moon, sunset, observer, true, true);
  const moonHor = Astronomy.Horizon(sunset, observer, moonEq.ra, moonEq.dec, 'normal');
  const moonAltitudeDeg = moonHor.altitude;
  const moonAzimuthDeg = moonHor.azimuth;

  const relativeAzimuthDeg = wrapDeg180(moonAzimuthDeg - sunAzimuthDeg);

  // Moonset is used to compute “lag”: how long the Moon remains above the horizon after sunset.
  // If the Moon is already below the horizon at sunset, we use the most recent moonset before sunset
  // so the lag is negative (meaning not visible).
  const nextMoonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, sunset, 2);
  const prevMoonset = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, sunset, -2);
  const moonsetTime = moonAltitudeDeg > 0 ? (nextMoonset ?? prevMoonset) : (prevMoonset ?? nextMoonset);
  const moonsetIso = safeIsoTime(moonsetTime);
  const lagMinutes = moonsetTime ? (moonsetTime.date.getTime() - sunset.getTime()) / 60000 : undefined;

  const illum = Astronomy.Illumination(Astronomy.Body.Moon, sunset);
  const moonIlluminationFraction = illum.phase_fraction;

  // The Moon's phase in degrees of geocentric ecliptic longitude difference from the Sun.
  // 0=new, 90=first quarter, 180=full, 270=third quarter.
  const phaseDeg = Astronomy.MoonPhase(sunset);
  const phase = phaseDeg / 360;

  // Prefer an explicit conjunction search for “moon age” (hours since new moon).
  const prevConjunction = Astronomy.SearchMoonPhase(0, sunset, -40);
  const moonAgeHours = prevConjunction
    ? (sunset.getTime() - prevConjunction.date.getTime()) / 3600000
    : phase * SYNODIC_MONTH_DAYS * 24;

  // Geocentric Sun/Moon elongation (angular separation as seen from Earth's center).
  const moonGeo = Astronomy.GeoVector(Astronomy.Body.Moon, sunset, true);
  const sunGeo = Astronomy.GeoVector(Astronomy.Body.Sun, sunset, true);
  const moonElongationDeg = Astronomy.AngleBetween(moonGeo, sunGeo);

  // Continuous score (0..1) based on simplified, interpretable components.
  // These are not official thresholds; they are intentionally conservative.
  const sAltitude = normalizeLinear(moonAltitudeDeg, 0, 10);
  const sElong = normalizeLinear(moonElongationDeg, 6, 15);
  const sAge = normalizeLinear(moonAgeHours, 12, 24);
  const sLag = lagMinutes === undefined ? 0 : normalizeLinear(lagMinutes, 0, 60);

  let visibilityScore = 0.35 * sAltitude + 0.35 * sElong + 0.2 * sAge + 0.1 * sLag;
  visibilityScore = clamp01(visibilityScore);

  let likelihood: MonthStartLikelihood;

  // This estimator is specifically about *new-month crescent* conditions.
  // Far from conjunction (new moon), we treat it as not a meaningful month-start signal.
  const isNearNewMoon = moonAgeHours <= MAX_CRESCENT_AGE_HOURS_FOR_MONTH_START;

  // If we're in the waning half of the cycle, treat as unlikely for a new month start.
  if (!isNearNewMoon || phase > 0.5) {
    likelihood = 'low';
    visibilityScore = 0;
  } else if (moonAltitudeDeg <= 0 || moonElongationDeg < 6 || moonAgeHours < 12) {
    likelihood = 'low';
    visibilityScore = Math.min(visibilityScore, 0.2);
  } else if (moonAltitudeDeg >= 7 && moonElongationDeg >= 12 && moonAgeHours >= 20) {
    likelihood = 'high';
    visibilityScore = Math.max(visibilityScore, 0.75);
  } else {
    likelihood = visibilityScore >= 0.66 ? 'high' : visibilityScore <= 0.33 ? 'low' : 'medium';
  }

  const visibilityPercent = Math.round(visibilityScore * 100);

  return {
    likelihood,
    metrics: {
      sunriseUtcIso: sunriseIso,
      sunsetUtcIso: sunsetIso,
      moonriseUtcIso: moonriseIso,
      moonsetUtcIso: moonsetIso,
      lagMinutes,
      moonAltitudeDeg,
      moonAzimuthDeg,
      sunAltitudeDeg,
      sunAzimuthDeg,
      relativeAzimuthDeg,
      moonElongationDeg,
      moonAgeHours,
      moonIlluminationFraction,
      visibilityScore,
      visibilityPercent
    }
  };
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function addDaysUtc(date: GregorianDate, deltaDays: number): GregorianDate {
  const dt = new Date(Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

function utcDayKey(date: GregorianDate): number {
  return Date.UTC(date.year, date.month - 1, date.day, 0, 0, 0);
}

function classifyFromPercent(percent: number): Exclude<MonthStartSignalLevel, 'unknown'> {
  if (percent <= 0) return 'noChance';
  if (percent <= 10) return 'veryLow';
  if (percent <= 35) return 'low';
  if (percent <= 65) return 'medium';
  return 'high';
}

export function getMoonVisibilityLevel(est: MonthStartEstimate | undefined): MoonVisibilityLevel {
  if (!est) return 'unknown';
  const lag = est.metrics.lagMinutes;
  const moonAltitudeDeg = est.metrics.moonAltitudeDeg;
  const percent = clampPercent(est.metrics.visibilityPercent ?? 0);

  if ((typeof lag === 'number' && lag <= 0) || (typeof moonAltitudeDeg === 'number' && moonAltitudeDeg <= 0)) {
    return 'noChance';
  }
  return classifyFromPercent(percent);
}

export function getMonthStartSignalLevel(est: MonthStartEstimate | undefined): MonthStartSignalLevel {
  if (!est) return 'unknown';
  const lag = est.metrics.lagMinutes;
  if (typeof lag === 'number' && lag <= 0) return 'noChance';
  const percent = clampPercent(est.metrics.visibilityPercent ?? 0);
  return classifyFromPercent(percent);
}

export function applyExclusiveMonthStartRule(levels: MonthStartSignalLevel[]): MonthStartSignalLevel[] {
  const normalized = [...levels];
  for (let i = 1; i < normalized.length; i += 1) {
    const prev = normalized[i - 1];
    if (prev === 'medium' || prev === 'high') {
      normalized[i] = 'noChance';
    }
  }
  return normalized;
}

export function buildDailyMonthStartSignals(
  startDate: GregorianDate,
  endDate: GregorianDate,
  location: ObserverLocation
): DailyMonthStartSignal[] {
  const startKey = utcDayKey(startDate);
  const endKey = utcDayKey(endDate);
  if (!Number.isFinite(startKey) || !Number.isFinite(endKey) || startKey > endKey) return [];

  const rows: DailyMonthStartSignal[] = [];
  let d = startDate;
  while (utcDayKey(d) <= endKey) {
    const eve = addDaysUtc(d, -1);
    const rawEstimate = estimateMonthStartLikelihoodAtSunset(eve, location);
    const monthStartSignal = getMonthStartSignalLevel(rawEstimate);
    const moonVisibility = getMoonVisibilityLevel(rawEstimate);
    const monthStartPercent = clampPercent(rawEstimate.metrics.visibilityPercent ?? 0);

    rows.push({
      gregorian: d,
      basedOnEve: eve,
      moonVisibility,
      monthStartSignal,
      monthStartPercent,
      rawEstimate,
      normalizedByPreviousDay: false
    });

    d = addDaysUtc(d, 1);
  }

  const normalizedLevels = applyExclusiveMonthStartRule(rows.map((r) => r.monthStartSignal));
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].monthStartSignal !== normalizedLevels[i]) {
      rows[i].monthStartSignal = normalizedLevels[i];
      rows[i].monthStartPercent = 0;
      rows[i].normalizedByPreviousDay = true;
    }
  }

  return rows;
}
