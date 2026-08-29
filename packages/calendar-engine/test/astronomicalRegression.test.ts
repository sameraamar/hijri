import { describe, expect, it } from 'vitest';

import {
  estimateMonthStartLikelihoodAtSunset,
  meetsMabimsCriteriaAtSunset,
  odehMonthStartEstimate,
  yallopMonthStartEstimate
} from '../src/index.js';

const JERUSALEM = { latitude: 31.7683, longitude: 35.2137 };
const MAKKAH = { latitude: 21.3891, longitude: 39.8579 };
const TROMSO = { latitude: 69.6492, longitude: 18.9553 };
const DATELINE_FIJI = { latitude: -17.7134, longitude: 178.065 };

function expectClose(actual: number | undefined, expected: number, precision = 2) {
  expect(typeof actual).toBe('number');
  expect(actual).toBeCloseTo(expected, precision);
}

describe('astronomical regression fixtures', () => {
  it('keeps the Jerusalem 2026-02-17 low-visibility boundary stable', () => {
    const date = { year: 2026, month: 2, day: 17 };
    const heuristic = estimateMonthStartLikelihoodAtSunset(date, JERUSALEM);
    const yallop = yallopMonthStartEstimate(date, JERUSALEM);
    const odeh = odehMonthStartEstimate(date, JERUSALEM);

    expect(heuristic.metrics.sunsetUtcIso).toBe('2026-02-17T15:27:18.582Z');
    expect(heuristic.metrics.moonsetUtcIso).toBe('2026-02-17T15:30:18.106Z');
    expectClose(heuristic.metrics.lagMinutes, 2.992, 3);
    expectClose(heuristic.metrics.moonAltitudeDeg, 0.283, 3);
    expectClose(heuristic.metrics.moonElongationDeg, 1.901, 3);
    expect(heuristic.metrics.visibilityPercent).toBe(1);
    expect(meetsMabimsCriteriaAtSunset(heuristic)).toBe(false);

    expectClose(yallop.metrics.yallopQ, -1.125, 3);
    expect(yallop.metrics.yallopZone).toBe('F');
    expectClose(odeh.metrics.odehV, -6.582, 3);
    expect(odeh.metrics.odehZone).toBe('D');
  });

  it('keeps the Makkah 2026-02-18 favorable case stable across criteria', () => {
    const date = { year: 2026, month: 2, day: 18 };
    const heuristic = estimateMonthStartLikelihoodAtSunset(date, MAKKAH);
    const yallop = yallopMonthStartEstimate(date, MAKKAH);
    const odeh = odehMonthStartEstimate(date, MAKKAH);

    expect(heuristic.likelihood).toBe('high');
    expectClose(heuristic.metrics.lagMinutes, 58.956, 3);
    expectClose(heuristic.metrics.moonAltitudeDeg, 12.308, 3);
    expectClose(heuristic.metrics.moonElongationDeg, 14.007, 3);
    expect(heuristic.metrics.visibilityPercent).toBe(96);
    expect(meetsMabimsCriteriaAtSunset(heuristic)).toBe(true);

    expectClose(yallop.metrics.yallopQ, 0.387, 3);
    expect(yallop.metrics.yallopZone).toBe('A');
    expectClose(odeh.metrics.odehV, 8.537, 3);
    expect(odeh.metrics.odehZone).toBe('A');
  });

  it('handles high-latitude dates without a normal sunset as unknown', () => {
    const date = { year: 2026, month: 6, day: 15 };

    expect(estimateMonthStartLikelihoodAtSunset(date, TROMSO).likelihood).toBe('unknown');
    expect(yallopMonthStartEstimate(date, TROMSO).likelihood).toBe('unknown');
    expect(odehMonthStartEstimate(date, TROMSO).likelihood).toBe('unknown');
  });

  it('keeps a date-line location finite and method-specific', () => {
    const date = { year: 2026, month: 2, day: 18 };
    const heuristic = estimateMonthStartLikelihoodAtSunset(date, DATELINE_FIJI);
    const yallop = yallopMonthStartEstimate(date, DATELINE_FIJI);
    const odeh = odehMonthStartEstimate(date, DATELINE_FIJI);

    expect(heuristic.likelihood).toBe('medium');
    expect(heuristic.metrics.visibilityPercent).toBe(50);
    expect(yallop.metrics.yallopZone).toBe('F');
    expect(odeh.metrics.odehZone).toBe('C');
    expect(Number.isFinite(heuristic.metrics.moonAltitudeDeg)).toBe(true);
  });
});