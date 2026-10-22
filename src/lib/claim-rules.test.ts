import { describe, expect, it } from 'vitest';

import { checkClaim } from './claim-rules';

// ETH: 18 decimals, 1.5 available, min 0.01, fee 0.0012.
const limits = {
  decimals: 18,
  available: 1_500000000000000000n,
  minAmount: '0.01',
  fee: '0.0012',
};

describe('checkClaim', () => {
  it('computes fee and receive amount exactly', () => {
    expect(checkClaim('0.5', limits)).toEqual({
      ok: true,
      amount: 500000000000000000n,
      fee: 1200000000000000n,
      receive: 498800000000000000n,
    });
  });

  it('accepts exactly the minimum and exactly the available balance (Max)', () => {
    expect(checkClaim('0.01', limits).ok).toBe(true);
    expect(checkClaim('1.5', limits).ok).toBe(true);
  });

  it('accepts a comma as decimal separator', () => {
    expect(checkClaim('0,5', limits).ok).toBe(true);
  });

  it.each([
    ['', 'Enter an amount.'],
    ['.5', 'Enter a number like 0.5 or 12.'],
    ['05', 'Enter a number like 0.5 or 12.'],
    ['1e-3', 'Enter a number like 0.5 or 12.'],
    ['0.009', 'Minimum is 0.01.'],
    ['1.500000000000000001', 'More than your available balance.'],
    ['0.1234567890123456789', 'At most 18 decimal places.'],
  ])('rejects %j', (input, error) => {
    expect(checkClaim(input, limits)).toEqual({ ok: false, error });
  });

  it('rejects an amount that does not exceed the fee', () => {
    const r = checkClaim('0.0012', { ...limits, minAmount: '0.001' });
    expect(r.ok).toBe(false);
  });

  it('respects asset decimals for 6-decimal assets', () => {
    const usdt = { decimals: 6, available: 820_413207n, minAmount: '10', fee: '1' };
    expect(checkClaim('820.413207', usdt).ok).toBe(true);
    expect(checkClaim('10.0000001', usdt)).toEqual({
      ok: false,
      error: 'At most 6 decimal places.',
    });
  });
});
