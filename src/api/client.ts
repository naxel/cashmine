import { z } from 'zod';

// The only place the API base URL lives.
export const API_BASE_URL = 'https://task-api.cashmine.io/v1';

const TOKEN_KEY = 'cashmine.token';
const DEFAULT_TIMEOUT_MS = 15_000;

// localStorage can be missing (static prerender) or throw (private mode, blocked storage).
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token.trim());
  } catch {
    // Storage unavailable: the token lives only until reload.
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly field?: string;
  readonly retryAfterMs?: number;
  // True when the request may have been applied server-side (network, timeout, 500/503/504).
  readonly outcomeUnknown: boolean;

  constructor(opts: {
    status: number | null;
    code: string;
    message: string;
    field?: string;
    retryAfterMs?: number;
    outcomeUnknown: boolean;
  }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.field = opts.field;
    this.retryAfterMs = opts.retryAfterMs;
    this.outcomeUnknown = opts.outcomeUnknown;
  }
}

const errorBodySchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().optional(),
    retryAfterMs: z.number().optional(),
  }),
});

type ApiInit = {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function api<T>(path: string, schema: z.ZodType<T>, init: ApiInit = {}): Promise<T> {
  const token = getToken();
  if (!token) {
    throw new ApiError({
      status: null,
      code: 'UNAUTHORIZED',
      message: 'No API token set',
      outcomeUnknown: false,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  init.signal?.addEventListener('abort', onCallerAbort);

  let res: Response;
  try {
    res = await fetch(API_BASE_URL + path, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined && { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    const timedOut = controller.signal.aborted && !init.signal?.aborted;
    throw new ApiError({
      status: null,
      code: timedOut ? 'TIMEOUT' : 'NETWORK',
      message: timedOut ? 'The request timed out' : 'Network error',
      outcomeUnknown: true,
    });
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', onCallerAbort);
  }

  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = errorBodySchema.safeParse(json);
    const retryAfterHeader = Number(res.headers.get('Retry-After'));
    const retryAfterMs =
      parsed.data?.error.retryAfterMs ??
      (Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader * 1000
        : undefined);
    throw new ApiError({
      status: res.status,
      code: parsed.data?.error.code ?? 'SERVER',
      message: parsed.data?.error.message ?? `HTTP ${res.status}`,
      field: parsed.data?.error.field,
      retryAfterMs,
      outcomeUnknown: res.status >= 500,
    });
  }

  return schema.parse(json);
}
