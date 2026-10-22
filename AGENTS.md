# Expo SDK 58, web target

Read the versioned docs at https://docs.expo.dev/versions/v58.0.0/ before writing code.
Deliverable is a phone-sized web app deployed to EAS Hosting; native iOS/Android not required.
Secrets live in `.env.local` and are read only in Expo Router API routes (`src/app/api/*+api.ts`), never in client code.
A generic proxy already exists: `src/app/api/[...path]+api.ts` forwards `/api/*` to `API_BASE_URL` with the token
(adjust only `authHeaders()`). Client code calls it via `api(path, zodSchema)` from `src/api/client.ts`; do not write another client.
Server state goes through TanStack Query; validate every API response with zod (v4 API) at the boundary.
Run `npm run check` before every commit.
Keep README.md current: when a decision or assumption is made, add one line under Decisions or Assumptions.

## Web constraints

Runs in mobile Safari and Chrome; react-native-web, not native. Silent no-ops on web, do not use:
`Alert.alert` (render errors inline, confirm via `Modal`), `RefreshControl` pull gesture (add a refresh button),
`KeyboardAvoidingView`, `expo-haptics`, `expo-secure-store`.

- CORS applies: call external APIs only through API routes, never directly from the client.
- API routes run on Cloudflare Workers (EAS Hosting), not Node: no `fs`, no Node-only packages.
- `TextInput` fontSize >= 16 (smaller makes iOS Safari zoom on focus).
- Root container `flex: 1` and `maxWidth: 480` centered; give `FlatList` a bounded height.
- Shadows via `boxShadow`, not `shadow*` props.
- Verify: `curl` the API routes, and check the browser console for errors after each feature.

## Domain rules

<!-- filled in after reading the brief -->
