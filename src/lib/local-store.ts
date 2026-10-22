import { useSyncExternalStore } from 'react';
import type { z } from 'zod';

// A JSON value in localStorage, validated on read, shared across components and tabs.
export function createLocalStore<T>(key: string, schema: z.ZodType<T>, fallback: T) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedValue = fallback;

  function read(): T {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      // Storage blocked: behave as empty.
    }
    // useSyncExternalStore needs a stable reference while the value is unchanged.
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const parsed = raw === null ? null : schema.safeParse(safeJson(raw));
      cachedValue = parsed?.success ? parsed.data : fallback;
    }
    return cachedValue;
  }

  function write(value: T) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Not persisted; still notify so this tab updates via the cache below.
    }
    cachedRaw = JSON.stringify(value);
    cachedValue = value;
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => e.key === key && listener();
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  function use(): T {
    return useSyncExternalStore(subscribe, read, () => fallback);
  }

  return { read, write, use };
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
