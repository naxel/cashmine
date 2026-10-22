# Notes

## Decisions

- **Amounts as BigInt minor units.** API strings are parsed into `bigint` scaled by the asset's `decimals`; fee,
  receive amount, validation and USD totals are exact integer math (USD at a fixed 10^-36 scale, rounded once to
  cents for display). ETH has 18 decimals, beyond `Number` precision. Alternatives: `Number` (rejected: float error),
  decimal.js/big.js (fine, but a dependency that still needs decimals enforced by hand).
- **Balance right after a claim: adjust locally, hand back to the server.** Approaches compared with AI (see
  `ai-logs/`): (A) show the raw snapshot plus a "claim in progress" card; (B) adjust the displayed balance at once
  and stop once the server's snapshot includes the claim; (C) grey out the asset as "updating" until the snapshot
  catches up. Chose B plus A's disabled Claim button. B answers "my balance didn't change, so I claimed again"
  directly; A leaves stale numbers for up to 15 s, C hides the balance on every claim. The "dropped, then jumped
  back" complaint is avoided by deciding with server clocks only: a snapshot includes a claim when
  `asOf >= claim.createdAt`, so the adjustment never applies twice. The only jump back is a real failure, shown
  with its `failureReason`. Submitted claims `{id, asset, amount, createdAt, status}` are persisted in
  localStorage so a reload within 15 s does not bring back the old balance. Logic is a pure, tested function:
  `src/lib/displayed-balance.ts`.
  - Refinement over the first rule ("drop once completed"): a completed claim still reduces `available` while
    the snapshot is older than `createdAt`, otherwise a failing refresh would show the pre-claim balance again.
- **Unknown claim outcome (network error, timeout, 500/503/504): retry quietly, then ask.** Compared: (A) silent
  retries with the same `Idempotency-Key`; (B) a "couldn't confirm" screen with Retry; (C) also count the amount
  as claiming. Chose A then B: up to 3 quiet retries (1 s, 3 s, 7 s), then the screen. The intent
  `{key, asset, amount, destinationId}` is saved before the POST, so after a reload the app offers Retry with the
  same key, never a new one, and new claims are blocked until it resolves. Rejected C: showing money as moved
  before the server confirms is what causes "dropped, then jumped back". Note: a same-key retry is not a pure
  status check; if the first request never arrived, it creates the claim, which is what the user confirmed.
  4xx answers (VALIDATION, 409) are definite: no claim, message shown, form kept.
- **USD total = available + pending + claiming.** The whole payback position; per-asset rows show what is
  claimable now.
- **Direct API calls, no proxy.** The API has open CORS and the token belongs to the user, so nothing secret sits
  server-side; the app is a static web build.
- **Token in localStorage.** Required by the brief. Readable by any script on the page (XSS); acceptable because
  the app loads no third-party scripts. Changing the token clears cached data and local claims.

## Assumptions

- Claim options `minAmount`/`fee` fit within the asset's `decimals`; otherwise the form shows an error.
- `amount` must be greater than `fee` (docs do not cover fee >= amount).
- The server remembers idempotency keys long enough for a retry after reload (docs give no TTL).
- Comma typed as decimal separator is accepted as a dot.

## Working with AI

TODO: three moments with pointers into `ai-logs/`.

## Not done / known issues

TODO.
