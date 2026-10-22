# <App name>

Live: <url> · Brief received <HH:MM UTC>, submitted <HH:MM UTC>

<One sentence: what the app does.>

## Run locally

```
npm install
cp .env.example .env.local   # fill API_BASE_URL and API_TOKEN
npm run web
```

Deploy: `npm run deploy` (EAS Hosting).

## Stack

Expo SDK, Expo Router (web output: server), TypeScript, TanStack Query, zod.

## Architecture

- `src/app/api/[...path]+api.ts`: server-side proxy, keeps the API token out of the client bundle.
- `src/api/`: typed client and one hook per endpoint; responses validated with zod.

## Decisions

## Assumptions

## Not done / next steps

## AI usage

Built with Claude Code; full sessions in `ai-logs/`. Project setup (lint, format, proxy, typed client) came from my starter script and is the first commit.
