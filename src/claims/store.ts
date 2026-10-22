import { z } from 'zod';

import { type ClaimStatus, type MyClaim } from '@/lib/displayed-balance';
import { createLocalStore } from '@/lib/local-store';

const myClaimSchema = z.object({
  id: z.string(),
  asset: z.string(),
  amount: z.string(),
  createdAt: z.string(),
  status: z.enum(['pending', 'completed', 'failed']),
});

// Claims this browser submitted; drive the displayed-balance adjustment across reloads.
export const myClaimsStore = createLocalStore<MyClaim[]>(
  'cashmine.myClaims',
  z.array(myClaimSchema),
  [],
);

export function addMyClaim(claim: MyClaim) {
  const rest = myClaimsStore.read().filter((c) => c.id !== claim.id);
  myClaimsStore.write([...rest, claim]);
}

export function setMyClaimStatus(id: string, status: ClaimStatus) {
  const claims = myClaimsStore.read();
  if (!claims.some((c) => c.id === id && c.status !== status)) return;
  myClaimsStore.write(claims.map((c) => (c.id === id ? { ...c, status } : c)));
}

export function replaceMyClaims(claims: MyClaim[]) {
  if (claims.length !== myClaimsStore.read().length) myClaimsStore.write(claims);
}

const intentSchema = z.object({
  key: z.string(),
  asset: z.string(),
  amount: z.string(),
  destinationId: z.string(),
});

export type ClaimIntent = z.infer<typeof intentSchema>;

// A submitted claim whose result we do not know yet. Saved before the POST so a reload
// retries with the same Idempotency-Key instead of creating a second claim.
export const intentStore = createLocalStore<ClaimIntent | null>(
  'cashmine.claimIntent',
  intentSchema.nullable(),
  null,
);

export function clearClaimState() {
  myClaimsStore.write([]);
  intentStore.write(null);
}
