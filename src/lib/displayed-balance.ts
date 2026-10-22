import { parseAmount, usdValue, type Decimal } from './amount';

export type ClaimStatus = 'pending' | 'completed' | 'failed';

// A claim this browser submitted, persisted so a reload keeps the adjustment.
export type MyClaim = {
  id: string;
  asset: string;
  amount: string;
  createdAt: string;
  status: ClaimStatus;
};

export type SnapshotItem = {
  asset: string;
  decimals: number;
  available: bigint;
  pending: bigint;
  claiming: bigint;
  usdPrice: Decimal;
};

export type Snapshot = { asOf: string; items: SnapshotItem[] };

export type DisplayedItem = SnapshotItem & { usdTotal: bigint };
export type DisplayedBalances = { asOf: string; items: DisplayedItem[]; usdTotal: bigint };

// The snapshot already reflects a claim once it was taken at or after the claim's creation.
// Both timestamps come from the server clock.
function snapshotIncludes(asOf: string, claim: MyClaim) {
  return Date.parse(asOf) >= Date.parse(claim.createdAt);
}

// Balance to show: the server snapshot plus claims it does not include yet.
// pending: moves available -> claiming. completed: leaves available (claiming already settled).
// failed: the server returned the amount to available, so no adjustment.
export function displayBalances(snapshot: Snapshot, myClaims: MyClaim[]): DisplayedBalances {
  const items = snapshot.items.map((item) => {
    let { available, claiming } = item;
    for (const claim of myClaims) {
      if (claim.asset !== item.asset || claim.status === 'failed') continue;
      if (snapshotIncludes(snapshot.asOf, claim)) continue;
      const amount = parseAmount(claim.amount, item.decimals);
      if (amount === null) continue;
      available -= amount;
      if (claim.status === 'pending') claiming += amount;
    }
    // Never show a negative balance, even if local state disagrees with the server.
    if (available < 0n) available = 0n;
    const usdTotal = usdValue(available + item.pending + claiming, item.decimals, item.usdPrice);
    return { ...item, available, claiming, usdTotal };
  });
  return {
    asOf: snapshot.asOf,
    items,
    usdTotal: items.reduce((sum, item) => sum + item.usdTotal, 0n),
  };
}

// Claims still worth keeping: not yet in a snapshot and not failed.
export function pruneClaims(myClaims: MyClaim[], asOf: string): MyClaim[] {
  return myClaims.filter((c) => c.status !== 'failed' && !snapshotIncludes(asOf, c));
}
