import { useState, useEffect, useRef } from 'react';

const globalDataCache = new Map<string, any>();

/**
 * Invalidates (removes) all cache entries whose keys start with the given prefix.
 * Call this after mutations to ensure navigating to a page fetches fresh data.
 * 
 * @param prefix Key prefix to match (e.g. 'dashboard-' clears all dashboard cache entries)
 */
export function invalidateCache(prefix: string) {
  for (const key of globalDataCache.keys()) {
    if (key.startsWith(prefix)) {
      globalDataCache.delete(key);
    }
  }
}

/**
 * A custom hook to fetch and globally cache API requests.
 * Prevents flashing loading skeletons when returning to a previously visited page.
 * 
 * @param key Unique key representing the request (e.g. `dashboard-${dateStr}`)
 * @param fetcher Function that returns a Promise resolving to the data
 * @param dependencies Array of dependencies that should trigger a re-fetch when changed
 * @param revalidateOnMount If true, will re-fetch data in the background even if cached
 */
export function useQueryCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  dependencies: any[] = [],
  revalidateOnMount = false
) {
  // Initialize data synchronously from cache if it exists
  const [data, setData] = useState<T | null>(() => globalDataCache.get(key) || null);
  
  // If data exists, start with loading = false to prevent skeleton flash
  const [loading, setLoading] = useState<boolean>(() => !globalDataCache.has(key));
  const [error, setError] = useState<Error | null>(null);

  // Use a ref to track the latest key to prevent race conditions from concurrent fetches
  const activeKeyRef = useRef(key);

  const executeFetch = async (showLoadingState = true) => {
    if (showLoadingState) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetcher();
      if (activeKeyRef.current === key) {
        globalDataCache.set(key, res);
        setData(res);
        setLoading(false);
      }
    } catch (err) {
      if (activeKeyRef.current === key) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    activeKeyRef.current = key;

    const hasCachedData = globalDataCache.has(key);
    
    // If the key changes, and we don't have cached data for the new key,
    // we need to set data to null (or the new cached data) and loading to true immediately.
    if (!hasCachedData) {
      setData(null);
      setLoading(true);
      executeFetch(false);
    } else {
      setData(globalDataCache.get(key));
      setLoading(false);
      
      // Optionally revalidate in the background without showing loading state
      if (revalidateOnMount) {
        executeFetch(false);
      }
    }
    // Justification: ESLint cannot statically analyze spread elements (...dependencies) in the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...dependencies]);

  const mutate = (newData?: T) => {
    if (newData !== undefined) {
      globalDataCache.set(key, newData);
      setData(newData);
    } else {
      // Force refresh
      executeFetch(true);
    }
  };

  return { data, loading, error, mutate, setData };
}
