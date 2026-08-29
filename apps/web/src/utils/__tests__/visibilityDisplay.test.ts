import { describe, expect, it } from 'vitest';

import type { MonthStartEstimate } from '@hijri/calendar-engine';
import { getMethodNativeClassification, shouldShowMonthStartIndex } from '../visibilityDisplay';

describe('visibility display semantics', () => {
  it('shows the heuristic score as an index', () => {
    const estimate: MonthStartEstimate = {
      kind: 'heuristic',
      likelihood: 'medium',
      metrics: { visibilityPercent: 72 }
    };

    expect(shouldShowMonthStartIndex(estimate)).toBe(true);
    expect(getMethodNativeClassification(estimate)).toBeNull();
  });

  it('shows Yallop as a method-native zone instead of a percentage index', () => {
    const estimate: MonthStartEstimate = {
      kind: 'yallop',
      likelihood: 'high',
      metrics: { visibilityPercent: 80, yallopZone: 'B', yallopZoneDescription: 'Visible under perfect conditions' }
    };

    expect(shouldShowMonthStartIndex(estimate)).toBe(false);
    expect(getMethodNativeClassification(estimate)).toEqual({
      labelKey: 'probability.yallopZone',
      zone: 'B',
      description: 'Visible under perfect conditions'
    });
  });

  it('shows Odeh as a method-native zone instead of a percentage index', () => {
    const estimate: MonthStartEstimate = {
      kind: 'odeh',
      likelihood: 'high',
      metrics: { visibilityPercent: 75, odehZone: 'B', odehZoneDescription: 'Visible by optical aid; may be seen by naked eye' }
    };

    expect(shouldShowMonthStartIndex(estimate)).toBe(false);
    expect(getMethodNativeClassification(estimate)).toEqual({
      labelKey: 'probability.odehZone',
      zone: 'B',
      description: 'Visible by optical aid; may be seen by naked eye'
    });
  });
});