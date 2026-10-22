# Notes

## Decisions

- **Direct API calls, no proxy.** The task API has open CORS and the token belongs to the user, so there is
  nothing secret to hide server-side. The scaffold's server proxy and `.env` were removed; the app is a static web build.
- **Token in localStorage.** Required by the brief (entered on first open, changeable). Trade-off: readable by any
  script on the page (XSS); acceptable here because the app loads no third-party scripts.
- **Amounts as BigInt minor units.** Strings from the API are parsed into `bigint` scaled by the asset's `decimals`;
  fee, receive amount and validation are exact integer math. Alternatives: `Number` (rejected: float error on money),
  decimal.js/big.js (works, but adds a dependency and still needs decimals enforced by hand).
- **USD total = available + pending + claiming.** Shows the user's whole payback position; per-asset breakdown shows
  what is claimable now. USD is computed with fixed-point BigInt too and rounded once for display.
- **Unknown outcome = network error, timeout, 500/503/504.** Retried with the same `Idempotency-Key`, which the API
  guarantees never creates a second claim. The pending intent is persisted so a reload cannot lose the key.
- TODO: what the balance shows right after a claim is submitted (to decide after comparing approaches with AI).
- TODO: what the user sees when a claim result is unknown (UI side).

## Working with AI

TODO: three moments with pointers into `ai-logs/`.

## Not done / known issues

TODO.
