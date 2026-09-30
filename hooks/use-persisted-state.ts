import { useCallback, useSyncExternalStore } from 'react';

type Primitive = string | number | boolean;
// Widen literal fallbacks (e.g. `true`) to their base type.
type Widen<T> = T extends string ? string : T extends number ? number : boolean;

// Shared across hook instances so every subscriber sees writes immediately.
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
};

function read<T extends Primitive>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw === null ? fallback : JSON.parse(raw);
    return typeof value === typeof fallback ? (value as T) : fallback;
  } catch {
    return fallback;
  }
}

// localStorage-backed state for primitives. Renders `fallback` on the server
// and during hydration, then switches to the stored value.
export function usePersistedState<T extends Primitive>(
  key: string,
  fallback: T,
) {
  const initial = fallback as unknown as Widen<T> & Primitive;
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, initial),
    () => initial,
  );
  const setValue = useCallback(
    (next: Widen<T> | ((current: Widen<T>) => Widen<T>)) => {
      const resolved =
        typeof next === 'function' ? next(read(key, initial)) : next;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* Storage blocked; state simply won't persist. */
      }
      listeners.forEach((listener) => listener());
    },
    [key, initial],
  );
  return [value as Widen<T>, setValue] as const;
}
