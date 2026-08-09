import { useState, useEffect } from 'react';

const stateCache = new Map<string, any>();

/**
 * A drop-in replacement for useState that caches its value globally.
 * Useful for preserving UI state (like search filters, tabs) when 
 * navigating away and coming back.
 * 
 * @param key Unique identifier for the state (e.g. `customer-search-query`)
 * @param initialState Default value if no cached value exists
 */
export function useCachedState<T>(key: string, initialState: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (stateCache.has(key)) {
      return stateCache.get(key) as T;
    }
    return typeof initialState === 'function' ? (initialState as () => T)() : initialState;
  });

  useEffect(() => {
    stateCache.set(key, state);
  }, [key, state]);

  return [state, setState];
}
