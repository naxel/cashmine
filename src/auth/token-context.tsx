import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';

import { clearToken, getToken, setToken } from '@/api/client';
import { clearClaimState } from '@/claims/store';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the token.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

// undefined during static prerender and hydration (no storage there), then string | null.
const getServerSnapshot = () => undefined;

export function useToken() {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore<string | null | undefined>(
    subscribe,
    getToken,
    getServerSnapshot,
  );

  const save = useCallback(
    (value: string) => {
      queryClient.clear();
      // Local claims belong to the previous token.
      clearClaimState();
      setToken(value);
      notify();
    },
    [queryClient],
  );

  const clear = useCallback(() => {
    queryClient.clear();
    clearClaimState();
    clearToken();
    notify();
  }, [queryClient]);

  return { token, save, clear };
}
