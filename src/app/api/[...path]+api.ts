// Proxies /api/<path> to the upstream API so the token never reaches the client.
const BASE_URL = process.env.API_BASE_URL;
const TOKEN = process.env.API_TOKEN;

function authHeaders(): Record<string, string> {
  // Adjust to the auth scheme in the API docs.
  return TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
}

async function proxy(request: Request): Promise<Response> {
  if (!BASE_URL) {
    return Response.json({ error: 'API_BASE_URL is not set' }, { status: 500 });
  }
  const url = new URL(request.url);
  // String concat keeps a path prefix in BASE_URL (e.g. https://host/v1).
  const upstream = BASE_URL.replace(/\/$/, '') + url.pathname.replace(/^\/api/, '') + url.search;
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();

  const res = await fetch(upstream, {
    method: request.method,
    headers: {
      'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
      Accept: 'application/json',
      ...authHeaders(),
    },
    body,
  });

  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
