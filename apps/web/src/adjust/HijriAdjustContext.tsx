import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hijri.adjustDays';

export const MIN_ADJUST_DAYS = -2;
export const MAX_ADJUST_DAYS = 2;
export const ADJUST_OPTIONS = [-2, -1, 0, 1, 2];

type HijriAdjustContextValue = {
  adjustDays: number;
  setAdjustDays: (days: number) => void;
};

const HijriAdjustContext = createContext<HijriAdjustContextValue | null>(null);

function clampAdjust(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_ADJUST_DAYS, Math.max(MIN_ADJUST_DAYS, Math.trunc(value)));
}

function readInitial(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? 0 : clampAdjust(Number(raw));
  } catch {
    return 0;
  }
}

export function HijriAdjustProvider({ children }: { children: React.ReactNode }) {
  const [adjustDays, setAdjustDaysState] = useState<number>(() => readInitial());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(adjustDays));
    } catch {
      // Storage can be unavailable (private mode); the in-memory value still applies.
    }
  }, [adjustDays]);

  const value = useMemo<HijriAdjustContextValue>(
    () => ({ adjustDays, setAdjustDays: (days: number) => setAdjustDaysState(clampAdjust(days)) }),
    [adjustDays]
  );

  return <HijriAdjustContext.Provider value={value}>{children}</HijriAdjustContext.Provider>;
}

export function useHijriAdjust(): HijriAdjustContextValue {
  const ctx = useContext(HijriAdjustContext);
  if (!ctx) throw new Error('useHijriAdjust must be used within HijriAdjustProvider');
  return ctx;
}
