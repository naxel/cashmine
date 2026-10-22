import { describe, expect, it } from 'vitest';

import { parseDecimal, type Decimal } from './amount';
import { displayBalances, pruneClaims, type MyClaim, type Snapshot } from './displayed-balance';

const price = (s: string) => parseDecimal(s) as Decimal;

// ETH with 18 decimals: 12.5 available, 0.02 pending.
const snapshot = (asOf: string, available = 12_500000000000000000n, claiming = 0n): Snapshot => ({
  asOf,
  items: [
    {
      asset: 'ETH',
      decimals: 18,
      available,
      pending: 20000000000000000n,
      claiming,
      usdPrice: price('2000'),
    },
    {
      asset: 'USDT',
      decimals: 6,
      available: 100_000000n,
      pending: 0n,
      claiming: 0n,
      usdPrice: price('1'),
    },
  ],
});

const claim = (over: Partial<MyClaim> = {}): MyClaim => ({
  id: 'clm_1',
  asset: 'ETH',
  amount: '0.5',
  createdAt: '2026-10-22T09:00:05.000Z',
  status: 'pending',
  ...over,
});

const eth = (b: ReturnType<typeof displayBalances>) => b.items.find((i) => i.asset === 'ETH')!;

describe('displayBalances', () => {
  it('moves a pending claim from available to claiming before the snapshot catches up', () => {
    const b = displayBalances(snapshot('2026-10-22T09:00:00.000Z'), [claim()]);
    expect(eth(b).available).toBe(12_000000000000000000n);
    expect(eth(b).claiming).toBe(500000000000000000n);
    // Total is unchanged: money moved between buckets.
    expect(eth(b).usdTotal).toBe(
      displayBalances(snapshot('2026-10-22T09:00:00.000Z'), []).items[0].usdTotal,
    );
  });

  it('does not subtract twice once the snapshot includes the claim', () => {
    const caughtUp = snapshot(
      '2026-10-22T09:00:15.000Z',
      12_000000000000000000n,
      500000000000000000n,
    );
    const b = displayBalances(caughtUp, [claim()]);
    expect(eth(b).available).toBe(12_000000000000000000n);
    expect(eth(b).claiming).toBe(500000000000000000n);
  });

  it('treats a snapshot taken exactly at createdAt as including the claim', () => {
    const b = displayBalances(snapshot('2026-10-22T09:00:05.000Z'), [claim()]);
    expect(eth(b).available).toBe(12_500000000000000000n);
  });

  it('ignores a failed claim: the amount is back in available', () => {
    const b = displayBalances(snapshot('2026-10-22T09:00:00.000Z'), [claim({ status: 'failed' })]);
    expect(eth(b).available).toBe(12_500000000000000000n);
    expect(eth(b).claiming).toBe(0n);
  });

  it('keeps a completed claim out of available when the snapshot is still older', () => {
    const b = displayBalances(snapshot('2026-10-22T09:00:00.000Z'), [
      claim({ status: 'completed' }),
    ]);
    expect(eth(b).available).toBe(12_000000000000000000n);
    expect(eth(b).claiming).toBe(0n);
  });

  it('sums two claims on one asset and leaves other assets alone', () => {
    const b = displayBalances(snapshot('2026-10-22T09:00:00.000Z'), [
      claim(),
      claim({ id: 'clm_2', amount: '1.25', createdAt: '2026-10-22T09:00:07.000Z' }),
    ]);
    expect(eth(b).available).toBe(10_750000000000000000n);
    expect(eth(b).claiming).toBe(1_750000000000000000n);
    expect(b.items[1].available).toBe(100_000000n);
  });

  it('applies only the claim the snapshot does not include yet', () => {
    // Snapshot taken between the two claims: it already has the first one.
    const between = snapshot(
      '2026-10-22T09:00:06.000Z',
      12_000000000000000000n,
      500000000000000000n,
    );
    const b = displayBalances(between, [
      claim(),
      claim({ id: 'clm_2', amount: '1.25', createdAt: '2026-10-22T09:00:07.000Z' }),
    ]);
    expect(eth(b).available).toBe(10_750000000000000000n);
    expect(eth(b).claiming).toBe(1_750000000000000000n);
  });

  it('sums USD across assets', () => {
    const b = displayBalances(snapshot('2026-10-22T09:00:00.000Z'), []);
    // ETH (12.5 + 0.02) * 2000 = 25040, USDT 100 -> 25140 USD at USD_SCALE 36.
    expect(b.usdTotal).toBe(25140n * 10n ** 36n);
  });
});

describe('pruneClaims', () => {
  it('drops failed claims and completed claims the snapshot includes; keeps pending', () => {
    const claims = [
      claim({ id: 'pending_included' }),
      claim({ id: 'completed_included', status: 'completed' }),
      claim({ id: 'completed_newer', createdAt: '2026-10-22T09:00:20.000Z', status: 'completed' }),
      claim({ id: 'failed', createdAt: '2026-10-22T09:00:20.000Z', status: 'failed' }),
    ];
    expect(pruneClaims(claims, '2026-10-22T09:00:15.000Z').map((c) => c.id)).toEqual([
      'pending_included',
      'completed_newer',
    ]);
  });
});
