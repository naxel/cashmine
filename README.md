# CashMine payback

Phone-sized web app (Expo, React Native Web) to view payback balances and claim them.

Live: TBD (first deploy pending)

## Run locally

```
npm install
npm run web
```

Open the printed URL and paste your API token on first open. The token is stored in the browser only.

Deploy: `npm run deploy` (EAS Hosting). Checks: `npm run check`.

## What works

- Typed API client (`src/api/client.ts`) with zod validation, timeouts and typed errors.
- UI: not built yet.

Decisions, AI usage and known issues: see [NOTES.md](NOTES.md).
