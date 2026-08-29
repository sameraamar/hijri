import type { MonthStartEstimate } from '@hijri/calendar-engine';

export type MethodNativeClassification = {
  labelKey: 'probability.yallopZone' | 'probability.odehZone';
  zone: string;
  description?: string;
};

export function getMethodNativeClassification(
  estimate: MonthStartEstimate
): MethodNativeClassification | null {
  if (estimate.kind === 'yallop' && estimate.metrics.yallopZone) {
    return {
      labelKey: 'probability.yallopZone',
      zone: estimate.metrics.yallopZone,
      description: estimate.metrics.yallopZoneDescription
    };
  }

  if (estimate.kind === 'odeh' && estimate.metrics.odehZone) {
    return {
      labelKey: 'probability.odehZone',
      zone: estimate.metrics.odehZone,
      description: estimate.metrics.odehZoneDescription
    };
  }

  return null;
}

export function shouldShowMonthStartIndex(estimate: MonthStartEstimate): boolean {
  return estimate.kind === 'heuristic' && typeof estimate.metrics.visibilityPercent === 'number';
}