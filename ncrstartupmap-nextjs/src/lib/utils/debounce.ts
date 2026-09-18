import { useEffect, useState } from "react";

/** Returns `value` after it has stopped changing for `wait` ms. */
export function useDebouncedValue<T>(value: T, wait = 150): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), wait);
    return () => clearTimeout(timer);
  }, [value, wait]);

  return debounced;
}
