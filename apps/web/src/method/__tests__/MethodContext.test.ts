import { afterEach, describe, expect, it, vi } from 'vitest';

import { readInitialMethodId } from '../MethodContext';

describe('readInitialMethodId', () => {
  const originalLocalStorage = globalThis.localStorage;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage
    });
  });

  it('uses a stored enabled method id', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => 'odeh' }
    });

    expect(readInitialMethodId()).toBe('odeh');
  });

  it('falls back to the default method when storage throws', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: () => { throw new Error('blocked'); } }
    });

    expect(readInitialMethodId()).toBe('estimate');
  });
});