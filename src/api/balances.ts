import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { AMOUNT_RE, parseAmount, parseDecimal, usdValue, type Decimal } from '@/lib/amount';

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
    const usdPrice = parseDecimal(item.usdPrice) as Decimal;
    if (available === null || pending === null || claiming === null) {
      ctx.addIssue({ code: 'custom', message: `${item.asset}: more places than decimals` });
      return z.NEVER;
    }
    const total = available + pending + claiming;
    return {
      asset: item.asset,
      decimals: item.decimals,
      available,
      pending,
      claiming,
      usdPrice,
      // USD at USD_SCALE; round only when displaying.
      usdTotal: usdValue(total, item.decimals, usdPrice),
    };
  });

export const balancesSchema = z
  .object({
    asOf: z.iso.datetime(),
    items: z.array(balanceItemSchema),
  })
  .transform((b) => ({
    ...b,
    usdTotal: b.items.reduce((sum, item) => sum + item.usdTotal, 0n),
  }));

export type Balances = z.infer<typeof balancesSchema>;
export type Balance = Balances['items'][number];

export const balancesKey = ['balances'] as const;

export function useBalances() {
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
