import { useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { api } from './client';

// Activity amounts are signed: negative for reversals and claims.
const signedAmount = z.string().regex(/^-?(0|[1-9]\d*)(\.\d+)?$/);

const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(['accrual', 'reversal', 'claim']),
  asset: z.string(),
  amount: signedAmount,
  status: z.enum(['pending', 'confirmed', 'completed', 'failed']),
  exchange: z.string().nullable(),
  createdAt: z.iso.datetime(),
  relatedId: z.string().nullable(),
});

export const activityPageSchema = z.object({
  items: z.array(activityItemSchema),
  nextCursor: z.string().nullable(),
});

export type ActivityItem = z.infer<typeof activityItemSchema>;

export function useActivity() {
  return useInfiniteQuery({
    queryKey: ['activity'],
    queryFn: ({ pageParam, signal }) =>
      api(
        `/activity?limit=20${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
        activityPageSchema,
        { signal },
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });
}
