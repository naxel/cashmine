import { describe, expect, it } from 'vitest';

import { formatAmount, formatUsd, parseAmount, parseDecimal, toCents, usdValue } from './amount';

describe('parseAmount', () => {
  it('parses into minor units, padding fewer places than decimals', () => {
    expect(parseAmount('50.12', 6)).toBe(50_120000n);
    expect(parseAmount('12', 6)).toBe(12_000000n);
    expect(parseAmount('0', 8)).toBe(0n);
  });

  it('keeps 18-decimal amounts exact (beyond Number precision)', () => {
    expect(parseAmount('12.345678901234591676', 18)).toBe(12345678901234591676n);
  });

  it.each(['.5', '1.', '05', '1e-3', '-1', '', ' 1', '1,5', '0x10'])('rejects %j', (s) => {
    expect(parseAmount(s, 6)).toBeNull();
  });

  it('rejects more places than decimals', () => {
    expect(parseAmount('0.0000001', 6)).toBeNull();
    expect(parseAmount('0.000001', 6)).toBe(1n);
  });
});

describe('formatAmount', () => {
  it('round-trips and trims trailing zeros', () => {
    expect(formatAmount(50_120000n, 6)).toBe('50.12');
    expect(formatAmount(12345678901234591676n, 18)).toBe('12.345678901234591676');
    expect(formatAmount(12_000000n, 6)).toBe('12');
    expect(formatAmount(1n, 8)).toBe('0.00000001');
    expect(formatAmount(-5n, 2)).toBe('-0.05');
  });
});

describe('USD', () => {
  it('values amounts exactly and rounds once to cents', () => {
    // 870.533207 USDT * 1.0002 = 870.7073136414 -> $870.71
    const v = usdValue(870_533207n, 6, parseDecimal('1.0002')!);
    expect(formatUsd(toCents(v))).toBe('$870.71');
  });

  it('rounds half away from zero and groups thousands', () => {
    expect(formatUsd(toCents(usdValue(5n, 3, parseDecimal('1')!)))).toBe('$0.01'); // 0.005
    expect(formatUsd(toCents(usdValue(4n, 3, parseDecimal('1')!)))).toBe('$0.00'); // 0.004
    expect(formatUsd(123456789n)).toBe('$1,234,567.89');
  });
});
