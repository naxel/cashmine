import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';

import { myClaimsStore, replaceMyClaims } from '@/claims/store';
import { AMOUNT_RE, parseAmount, parseDecimal, type Decimal } from '@/lib/amount';
import { displayBalances, pruneClaims, type DisplayedItem } from '@/lib/displayed-balance';

import { api, ApiError } from './client';

const amountString = z.string().regex(AMOUNT_RE);

const balanceItemSchema = z
  .object({
    asset: z.string().min(1),
    decimals: z.number().int().min(0).max(36),
    available: amountString,
    pending: amountString,
    claiming: amountString,
    usdPrice: amountString,
  })
  .transform((item, ctx) => {
    const available = parseAmount(item.available, item.decimals);
    const pending = parseAmount(item.pending, item.decimals);
    const claiming = parseAmount(item.claiming, item.decimals);
    if (available === null || pending === null || claiming === null) {
      ctx.addIssue({ code: 'custom', message: `${item.asset}: more places than decimals` });
      return z.NEVER;
    }
    return {
      asset: item.asset,
      decimals: item.decimals,
      available,
      pending,
      claiming,
      usdPrice: parseDecimal(item.usdPrice) as Decimal,
    };
  });

export const balancesSchema = z.object({
  asOf: z.iso.datetime(),
  items: z.array(balanceItemSchema),
});

export type Balance = DisplayedItem;

export const balancesKey = ['balances'] as const;

function useBalanceSnapshot() {
  return useQuery({
    queryKey: balancesKey,
    queryFn: ({ signal }) => api('/balances', balancesSchema, { signal }),
    // The server recomputes snapshots every 15 s.
    refetchInterval: 15_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status !== null && error.status < 500) {
        return error.code === 'RATE_LIMITED' && failureCount < 2;
      }
      return failureCount < 2;
    },
    retryDelay: (attempt, error) =>
      error instanceof ApiError && error.retryAfterMs
        ? error.retryAfterMs
        : Math.min(1000 * 2 ** attempt, 8000),
  });
}

// Snapshot adjusted for claims this browser submitted that the snapshot does not include yet.
export function useBalances() {
  const query = useBalanceSnapshot();
  const myClaims = myClaimsStore.useValue();
  const snapshot = query.data;

  useEffect(() => {
    if (snapshot) replaceMyClaims(pruneClaims(myClaimsStore.read(), snapshot.asOf));
  }, [snapshot, myClaims]);

  const data = useMemo(
    () => (snapshot ? displayBalances(snapshot, myClaims) : undefined),
    [snapshot, myClaims],
  );
  return { ...query, data };
}
