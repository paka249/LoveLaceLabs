import { useEffect, useState } from 'react';

export function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? defaultValue : JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) - ignore
    }
  }, [key, value]);

  return [value, setValue];
}
