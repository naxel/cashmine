import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { z } from 'zod';

import { addMyClaim, intentStore, setMyClaimStatus, type ClaimIntent } from '@/claims/store';
import { AMOUNT_RE } from '@/lib/amount';
import type { MyClaim } from '@/lib/displayed-balance';

import { balancesKey } from './balances';
import { api, ApiError } from './client';

const amountString = z.string().regex(AMOUNT_RE);

export const claimOptionsSchema = z.object({
  asset: z.string(),
  minAmount: amountString,
  fee: amountString,
  destinations: z.array(z.object({ id: z.string(), label: z.string() })),
});

export const claimSchema = z.object({
  id: z.string(),
  asset: z.string(),
  amount: amountString,
  fee: amountString,
  receiveAmount: amountString,
  destinationId: z.string(),
  status: z.enum(['pending', 'completed', 'failed']),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Claim = z.infer<typeof claimSchema>;

export function useClaimOptions(asset: string | undefined) {
  return useQuery({
    queryKey: ['claim-options', asset],
    queryFn: ({ signal }) =>
      api(`/claim-options?asset=${encodeURIComponent(asset!)}`, claimOptionsSchema, { signal }),
    enabled: !!asset,
    staleTime: 60_000,
  });
}

const RETRY_DELAYS_MS = [1000, 3000, 7000];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// POSTs the saved intent. Retries with the SAME Idempotency-Key while the outcome is
// unknown (network, timeout, 5xx) or rate limited; the API never creates a second claim.
// Throws the last ApiError: outcomeUnknown=true means the intent must stay saved.
export async function submitIntent(intent: ClaimIntent): Promise<Claim> {
  for (let attempt = 0; ; attempt++) {
    try {
      const claim = await api('/claims', claimSchema, {
        method: 'POST',
        headers: { 'Idempotency-Key': intent.key },
        body: { asset: intent.asset, amount: intent.amount, destinationId: intent.destinationId },
      });
      addMyClaim(toMyClaim(claim));
      intentStore.write(null);
      return claim;
    } catch (e) {
      const retryable = e instanceof ApiError && (e.outcomeUnknown || e.code === 'RATE_LIMITED');
      if (!retryable || attempt >= RETRY_DELAYS_MS.length) {
        // A definite answer means no claim exists for this key: forget the intent.
        if (!(e instanceof ApiError && e.outcomeUnknown)) intentStore.write(null);
        throw e;
      }
      await wait((e as ApiError).retryAfterMs ?? RETRY_DELAYS_MS[attempt]);
    }
  }
}

function toMyClaim(c: Claim): MyClaim {
  return { id: c.id, asset: c.asset, amount: c.amount, createdAt: c.createdAt, status: c.status };
}

const claimQuery = (id: string) => ({
  queryKey: ['claim', id],
  queryFn: ({ signal }: { signal: AbortSignal }) =>
    api(`/claims/${encodeURIComponent(id)}`, claimSchema, { signal }),
  // Poll while pending; a claim settles within about 20 s.
  refetchInterval: (q: { state: { data?: Claim } }) =>
    q.state.data && q.state.data.status !== 'pending' ? false : 2000,
});

// Keeps the local claim list and balances in step with a claim's server status.
function useSyncStatus(claims: (Claim | undefined)[]) {
  const queryClient = useQueryClient();
  const key = claims.map((c) => (c ? `${c.id}:${c.status}` : '')).join(',');
  useEffect(() => {
    let settled = false;
    for (const c of claims) {
      if (!c) continue;
      setMyClaimStatus(c.id, c.status);
      if (c.status !== 'pending') settled = true;
    }
    if (settled) queryClient.invalidateQueries({ queryKey: balancesKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, queryClient]);
}

export function useClaim(id: string) {
  const query = useQuery(claimQuery(id));
  useSyncStatus([query.data]);
  return query;
}

// Polls every locally pending claim (Home banners).
export function usePendingClaims(ids: string[]) {
  const results = useQueries({ queries: ids.map(claimQuery) });
  useSyncStatus(results.map((r) => r.data));
  return results;
}
