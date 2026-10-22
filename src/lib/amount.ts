// Money math on BigInt minor units. Never use Number/parseFloat on amounts.

// Digits, optional dot plus digits, no leading zeros: "0.5", "12" ok; ".5", "1.", "05", "1e-3" not.
export const AMOUNT_RE = /^(0|[1-9]\d*)(\.\d+)?$/;

// A decimal string as an exact fraction: value = units / 10^scale.
export type Decimal = { units: bigint; scale: number };

export function parseDecimal(input: string): Decimal | null {
  if (!AMOUNT_RE.test(input)) return null;
  const [whole, frac = ''] = input.split('.');
  return { units: BigInt(whole + frac), scale: frac.length };
}

// Parses an amount string into minor units of an asset with `decimals` places.
// Returns null when the string is malformed or has more than `decimals` places.
export function parseAmount(input: string, decimals: number): bigint | null {
  const d = parseDecimal(input);
  if (!d || d.scale > decimals) return null;
  return d.units * 10n ** BigInt(decimals - d.scale);
}

// Formats minor units back to the shortest valid amount string ("50.120000" -> "50.12").
export function formatAmount(minor: bigint, decimals: number): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const base = 10n ** BigInt(decimals);
  const whole = (abs / base).toString();
  const frac = (abs % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return (negative ? '-' : '') + (frac ? `${whole}.${frac}` : whole);
}

// USD values are kept at this fixed scale until the final rounding for display.
export const USD_SCALE = 36;

// Exact USD value of `minor` units at `usdPrice`, scaled by 10^USD_SCALE.
// Truncates only if decimals + price scale exceed USD_SCALE (not the case for real assets).
export function usdValue(minor: bigint, decimals: number, usdPrice: Decimal): bigint {
  const raw = minor * usdPrice.units;
  const shift = USD_SCALE - decimals - usdPrice.scale;
  return shift >= 0 ? raw * 10n ** BigInt(shift) : raw / 10n ** BigInt(-shift);
}

// Rounds a USD_SCALE value to cents, half away from zero.
export function toCents(value: bigint): bigint {
  const divisor = 10n ** BigInt(USD_SCALE - 2);
  const half = divisor / 2n;
  return value >= 0n ? (value + half) / divisor : -((-value + half) / divisor);
}

// "$1,234.56"
export function formatUsd(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}$${whole}.${frac}`;
}
