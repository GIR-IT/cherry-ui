import { useCallback, useState } from "react";

/** State mirrored to localStorage. Storage failures (private mode, quota) fall back to memory. */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? initial : (JSON.parse(stored) as T);
    } catch {
      return initial;
    }
  });

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        if (next === null || next === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* memory only */
      }
    },
    [key],
  );

  return [value, update] as const;
}
