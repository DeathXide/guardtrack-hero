import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo, useRef } from 'react';

type FilterDefaults = Record<string, string>;

export function usePersistedFilters(defaults: FilterDefaults) {
  const [searchParams, setSearchParams] = useSearchParams();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const values = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [key, defaultValue] of Object.entries(defaults)) {
      result[key] = searchParams.get(key) || defaultValue;
    }
    return result;
  }, [searchParams, defaults]);

  const setFilter = useCallback(
    (key: string, value: string, debounceMs?: number) => {
      const apply = () => {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (value === defaults[key]) {
              next.delete(key);
            } else {
              next.set(key, value);
            }
            return next;
          },
          { replace: true }
        );
      };

      if (debounceMs) {
        if (debounceTimers.current[key]) {
          clearTimeout(debounceTimers.current[key]);
        }
        debounceTimers.current[key] = setTimeout(apply, debounceMs);
      } else {
        apply();
      }
    },
    [setSearchParams, defaults]
  );

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { values, setFilter, resetFilters };
}
