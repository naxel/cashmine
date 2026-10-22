# Expo SDK 58, web target

Read the versioned docs at https://docs.expo.dev/versions/v58.0.0/ before writing code.
Deliverable is a phone-sized web app deployed to EAS Hosting; native iOS/Android not required.
API token is entered by the user, stored in localStorage, never in code.
Server state goes through TanStack Query; validate every API response with zod (v4 API) at the boundary.
Run `npm run check` before every commit.

## Web constraints

Runs in mobile Safari and Chrome; react-native-web, not native. Silent no-ops on web, do not use:
`Alert.alert` (render errors inline, confirm via `Modal`), `RefreshControl` pull gesture (add a refresh button),
`KeyboardAvoidingView`, `expo-haptics`, `expo-secure-store`.

- Task API has open CORS: the client calls it directly via `api(path, zodSchema)` in `src/api/client.ts`;
  the base URL constant lives only there. Do not write another client.
- API routes run on Cloudflare Workers (EAS Hosting), not Node: no `fs`, no Node-only packages.
- `TextInput` fontSize >= 16 (smaller makes iOS Safari zoom on focus).
- Root container `flex: 1` and `maxWidth: 480` centered; give `FlatList` a bounded height.
- Shadows via `boxShadow`, not `shadow*` props.
- Verify: `curl` the API, and check the browser console for errors after each feature.

## Domain rules

API docs: https://task-api.cashmine.io/docs. Money is real for users: correctness over polish.

Amounts

- Amounts are decimal strings at the API boundary, never JSON numbers. In the app parse to BigInt minor
  units using the asset's `decimals`. Never `Number`/`parseFloat` on money, USD included.
- Valid amount string: `^(0|[1-9]\d*)(\.\d+)?$` and at most `decimals` places (`.5`, `1.`, `05`, `1e-3` invalid).
- USD total = sum of (available + pending + claiming) × `usdPrice`, computed as fixed-point BigInt;
  round once at the end for display.
- Balances are snapshots recomputed every 15 s; always show `asOf`. A new claim may lag one snapshot.

Claims

- `minAmount`, `fee`, destinations always come from `GET /v1/claim-options?asset=`, never hardcoded.
- Valid claim: `minAmount <= amount <= available`, at most `decimals` places, and `amount > fee`.
  `available` is checked live server-side, so Max (snapshot) can still be rejected.
- receive = amount − fee; show amount, fee and receive before confirm.
- Status `pending` → `completed | failed` (~20 s). Poll `GET /v1/claims/{id}` until final; show `failureReason`.
  On failure the amount returns to `available`.

Idempotency and errors

- Every `POST /v1/claims` carries `Idempotency-Key` (UUID). One key per confirmed intent; new key only for a new intent.
- Persist the pending intent `{ key, asset, amount, destinationId }` in localStorage before POST, until the claim id
  is known. After reload with a pending unknown intent, offer "Check status / Retry" with the SAME key, never a new one.
- Outcome unknown = network error, abort/timeout, 500, 503, 504 (`ApiError.outcomeUnknown`): same-key retry is safe.
- 4xx with a code (VALIDATION, 409 IDEMPOTENCY_MISMATCH, ...) is definite: show the message inline, keep the form.
- 401: send the user to the token screen. 429: wait `retryAfterMs` before retrying.
