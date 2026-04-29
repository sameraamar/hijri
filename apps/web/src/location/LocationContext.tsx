import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { AppLocation } from './types';
import { MAKKAH_LOCATION } from './types';

type LocationContextValue = {
  location: AppLocation;
  setLocation: (loc: AppLocation) => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

const STORAGE_KEY = 'hijri.location';

function isValidLocation(v: unknown): v is AppLocation {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.latitude === 'number' &&
    typeof obj.longitude === 'number' &&
    Number.isFinite(obj.latitude) &&
    Number.isFinite(obj.longitude) &&
    Math.abs(obj.latitude) <= 90 &&
    Math.abs(obj.longitude) <= 180
  );
}

function readInitial(): AppLocation {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return MAKKAH_LOCATION;
    const parsed = JSON.parse(raw);
    if (isValidLocation(parsed)) return parsed;
  } catch {
    // Ignore SSR / private-mode / corrupted-JSON; fall through to default.
  }
  return MAKKAH_LOCATION;
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<AppLocation>(() => readInitial());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    } catch {
      // Storage may be disabled (private mode); a non-persistent session still works.
    }
  }, [location]);

  const value = useMemo<LocationContextValue>(() => ({ location, setLocation }), [location]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useAppLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useAppLocation must be used within LocationProvider');
  return ctx;
}
