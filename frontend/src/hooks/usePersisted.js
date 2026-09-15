import { useEffect, useState } from "react";

// Load a value from localStorage, falling back to defaultValue.
function lsGet(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

// Persist a value to localStorage whenever it changes.
export function usePersisted(key, defaultValue) {
  const [value, setValue] = useState(() => lsGet(key, defaultValue));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}
