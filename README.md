# CashMine payback

Phone-sized web app (Expo, React Native Web) to view payback balances and claim them.

Live: https://naxel1-cashmine.expo.app

## Run locally

```
npm install
npm run web
```

Open the printed URL and paste your API token on first open. The token is stored in the browser only.

Deploy: `npm run deploy` (EAS Hosting). Checks: `npm run check`.

## What works

- Typed API client (`src/api/client.ts`) with zod validation, timeouts and typed errors.
- Token screen: token entered on first open, stored in this browser, "Change token" on Home.
- Home: USD total (available + pending + claiming), per-asset balances, snapshot age, refresh button, auto-refresh every 15 s, loading / error / retry, stale-data banner when a refresh fails.
- Claim: pick asset, amount or Max, live validation (min, fee, decimals, available), fee and receive amount, confirm dialog, idempotent submit with retries, status page polling until completed/failed, "couldn't confirm" recovery with the same key after reload. Balance adjusts immediately after a claim and hands back to the server snapshot.
- Unit tests (`npm test`): amount parsing/formatting/USD, claim validation and fee, displayed balance after claims.
- Not yet: activity history.

Decisions, AI usage and known issues: see [NOTES.md](NOTES.md).
