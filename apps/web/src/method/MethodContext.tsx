import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { METHODS, type CalculationMethodId } from './types';

type MethodContextValue = {
  methodId: CalculationMethodId;
  setMethodId: (id: CalculationMethodId) => void;
};

const MethodContext = createContext<MethodContextValue | null>(null);

const STORAGE_KEY = 'hijri.methodId';

export function readInitialMethodId(): CalculationMethodId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const match = METHODS.find((x) => x.id === raw && x.enabled);
    if (match) return match.id;
  } catch {
    // Storage may be unavailable in private or embedded contexts.
  }
  return 'estimate';
}

export function MethodProvider({ children }: { children: React.ReactNode }) {
  const [methodId, setMethodIdState] = useState<CalculationMethodId>(() => readInitialMethodId());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, methodId);
    } catch {
      // Best-effort; the selected method still works for this session.
    }
  }, [methodId]);

  const setMethodId = (id: CalculationMethodId) => {
    const m = METHODS.find((x) => x.id === id);
    if (!m?.enabled) return;
    setMethodIdState(id);
  };

  const value = useMemo<MethodContextValue>(() => ({ methodId, setMethodId }), [methodId]);

  return <MethodContext.Provider value={value}>{children}</MethodContext.Provider>;
}

export function useMethod(): MethodContextValue {
  const ctx = useContext(MethodContext);
  if (!ctx) throw new Error('useMethod must be used within MethodProvider');
  return ctx;
}
