import { useEffect, useState } from "react";

type UseLocalStorageOptions<T> = {
  initializer?: () => T;
};

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>,
) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    // If initializer is provided, use it instead of default logic
    if (options?.initializer) {
      return options.initializer();
    }

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving to localStorage for key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
