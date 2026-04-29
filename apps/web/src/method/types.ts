export type CalculationMethodId = 'civil' | 'estimate' | 'mabims' | 'yallop' | 'odeh';

/** True when the method needs the per-evening astronomy estimator (vs deterministic civil). */
export function isAstronomicalMethod(id: CalculationMethodId): boolean {
  return id !== 'civil';
}

/** Maps the app's method id to the engine's `monthStartRule` for `buildEstimatedHijriCalendarRange`. */
export function methodIdToRule(id: CalculationMethodId): 'geometric' | 'mabims' | 'yallop' | 'odeh' {
  if (id === 'yallop') return 'yallop';
  if (id === 'odeh') return 'odeh';
  if (id === 'mabims') return 'mabims';
  // civil + estimate both default to the heuristic geometric rule (civil is filtered earlier).
  return 'geometric';
}

export type CalculationMethod = {
  id: CalculationMethodId;
  labelKey: string;
  enabled: boolean;
};

export const METHODS: CalculationMethod[] = [
  { id: 'estimate', labelKey: 'app.method.estimate', enabled: true },
  { id: 'mabims', labelKey: 'app.method.mabims', enabled: true },
  { id: 'yallop', labelKey: 'app.method.yallop', enabled: true },
  { id: 'odeh', labelKey: 'app.method.odeh', enabled: true },
  { id: 'civil', labelKey: 'app.method.civil', enabled: true }
];
