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
  Tested offline on the live build: 4 failed POSTs (first try + 3 quiet retries), the "couldn't confirm" screen,
  then Retry returned one 201, so one claim was created (`docs/unknown-outcome-network.png`,
  `docs/unknown-outcome-screen.png`).
- **USD total = available + pending + claiming.** The whole payback position; per-asset rows show what is
  claimable now.
- **Direct API calls, no proxy.** The API has open CORS and the token belongs to the user, so nothing secret sits
  server-side; the app is a static web build. I started from my own starter script (lint, format, and a server
  proxy for a secret token) and removed the proxy after reading the brief and the docs.
- **Token in localStorage.** Required by the brief. Readable by any script on the page (XSS); acceptable because
  the app loads no third-party scripts. Changing the token clears cached data and local claims.

## Assumptions

- Claim options `minAmount`/`fee` fit within the asset's `decimals`; otherwise the form shows an error.
- `amount` must be greater than `fee` (docs do not cover fee >= amount).
- The server remembers idempotency keys long enough for a retry after reload (docs give no TTL).
- Comma typed as decimal separator is accepted as a dot.

## Working with AI

All code was written in one Claude Code session in this folder (`ai-logs/claude-code-session.txt`). I also used a
second chat as a reviewer: I pasted plans and outputs there before approving them. It is mixed with private notes,
so it is not included; every change that came out of it went into the main session as my prompt. After reading the
docs, I had the AI write the domain rules into `AGENTS.md`, so later prompts shared the same rules for amounts,
idempotency and errors.

1. **A prompt that did not get what I wanted.** My first prompt asked for a docs summary and a plan. The plan said
   to commit "only if the user asks" and to verify the schema with `curl` and my token in the shell. Both were wrong
   here: the brief wants commits every 30 minutes, and a token in the session would end up in this public log. I
   asked for a commit after each step, and ran the `curl` myself in a separate terminal, pasting only the JSON.
   (Search the log: "commit everything", "Real /v1/balances response".)
2. **AI output that was wrong.** After the claim flow, all 36 unit tests passed and the build was deployed, but the
   app crashed on first open: "React has detected a change in the order of Hooks called by Home". I found it only
   by opening the live build myself. The cause: the localStorage hook was named `use()` and called as `store.use()`.
   React Compiler is on, and it treats `use` as React's `use()` API, not as a hook. Fix: rename it to `useValue`.
   Lesson: the tests cover pure money logic, not rendering, so I open the build after every deploy.
   (Search: "order of Hooks".)
3. **I disagreed with the AI.** For the balance after a claim, the AI offered three approaches and picked B. I agreed
   with B, but in its version the submitted claims lived only in memory. A reload within 15 s would show the old
   balance again, which is exactly the complaint "I claimed and my balance didn't change, so I claimed again". I
   asked to persist them in localStorage and restore the adjustment on load, with tests. (Search: "Persist my
   submitted claims".) The AI also pushed back on one of my rules, and it was right: see the refinement under the
   balance decision.

My own checks on the live build found two more issues the AI did not: the Claim button was active for an asset
with 0 available, and destination options looked like text fields. Both were fixed.

## Not done / known issues

- **Activity** is minimal: no refresh button or auto-refresh (new items appear on reopen), no filters, claim rows do
  not link to the claim status page, statuses are shown as raw API words. Amounts use decimals from the balances
  response; an asset missing there is shown as the API sent it. No tests for this screen.
- **Changing the token** clears saved claims and any unconfirmed attempt from the old token, so an unresolved
  attempt is lost. Better: keep claims and attempts per token.
- **Tests** cover amount parsing, validation, fee, USD totals and the displayed balance. There are no component or
  end-to-end tests; the crash above shows the gap. Next: one Playwright test of the claim flow with a mocked API.
- **Max** uses the snapshot's `available`, which can be up to 15 s old. The server checks live and returns
  VALIDATION, which the form shows inline.
- **After a deploy**, a tab left open can fail to load old JS chunks (404) until reloaded. Next: catch chunk-load
  errors and reload once.
- Idempotency key retention is not documented (see Assumptions).
