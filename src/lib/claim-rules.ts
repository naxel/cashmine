import { parseAmount } from './amount';

export type ClaimLimits = {
  decimals: number;
  available: bigint;
  minAmount: string;
  fee: string;
};

export type ClaimCheck =
  { ok: true; amount: bigint; fee: bigint; receive: bigint } | { ok: false; error: string };

// Users on some keyboards type a comma as the decimal separator.
export function normalizeAmountInput(input: string): string {
  return input.trim().replace(',', '.');
}

// Validates a typed amount against the API's claim rules. All math in minor units.
export function checkClaim(input: string, limits: ClaimLimits): ClaimCheck {
  const { decimals, available } = limits;
  const min = parseAmount(limits.minAmount, decimals);
  const fee = parseAmount(limits.fee, decimals);
  if (min === null || fee === null) return { ok: false, error: 'Claim options are invalid.' };

  const text = normalizeAmountInput(input);
  if (text === '') return { ok: false, error: 'Enter an amount.' };
  const amount = parseAmount(text, decimals);
  if (amount === null) {
    return /^(0|[1-9]\d*)\.\d+$/.test(text)
      ? { ok: false, error: `At most ${decimals} decimal places.` }
      : { ok: false, error: 'Enter a number like 0.5 or 12.' };
  }
  if (amount < min) return { ok: false, error: `Minimum is ${limits.minAmount}.` };
  if (amount > available) return { ok: false, error: 'More than your available balance.' };
  if (amount <= fee)
    return { ok: false, error: `Amount must be more than the fee (${limits.fee}).` };
  return { ok: true, amount, fee, receive: amount - fee };
}
