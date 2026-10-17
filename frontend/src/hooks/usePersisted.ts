import { Dispatch, SetStateAction, useEffect, useState } from "react";

// Load a value from localStorage, falling back to defaultValue.
function lsGet<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Persist a value to localStorage whenever it changes.
export function usePersisted<T>(
  key: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => lsGet(key, defaultValue));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable or full — persistence is best-effort.
    }
  }, [key, value]);
  return [value, setValue];
}
