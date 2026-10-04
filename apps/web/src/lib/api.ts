const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

type Body<T> =
  | { success: true; data: T; meta?: PageMeta }
  | { success: false; error: { code: string; message: string } };

// ── session ──────────────────────────────────────────────────────────────────
// The access token lives in memory only (never localStorage). The refresh token is an httpOnly cookie.
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

let refreshing: Promise<string | null> | null = null;

/**
 * Exchanges the refresh cookie for a new access token. Single-flight: refresh tokens are one-time-use,
 * so two concurrent refreshes would look like token theft to the server and end the session.
 */
export function refreshSession(): Promise<string | null> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      const body = (await res.json()) as Body<{ accessToken: string }>;
      accessToken = body.success ? body.data.accessToken : null;
    } catch {
      accessToken = null;
    } finally {
      refreshing = null;
    }

    return accessToken;
  })();

  return refreshing;
}

interface RequestInitLite {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

async function request<T>(
  path: string,
  init: RequestInitLite = {},
  retried = false,
): Promise<{ data: T; meta?: PageMeta }> {
  const headers: Record<string, string> = {};

  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      method: init.method ?? 'GET',
      credentials: 'include',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(
      'NETWORK_ERROR',
      'Cannot reach the ROMAtlas API. Check your connection.',
      0,
    );
  }

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    if (await refreshSession()) {
      return request<T>(path, init, true);
    }
  }

  let body: Body<T>;

  try {
    body = (await res.json()) as Body<T>;
  } catch {
    throw new ApiError(
      'BAD_RESPONSE',
      'The server returned an unexpected response.',
      res.status,
    );
  }

  if (!body.success) {
    throw new ApiError(
      body.error.code,
      body.error.message,
      res.status,
    );
  }

  return body;
}

export async function apiGet<T>(path: string): Promise<T> {
  return (await request<T>(path)).data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return (await request<T>(path, { method: 'POST', body })).data;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return (await request<T>(path, { method: 'PATCH', body })).data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  return (await request<T>(path, { method: 'DELETE' })).data;
}

export async function apiGetPage<T>(path: string): Promise<Paged<T>> {
  const body = await request<T[]>(path);

  return {
    data: body.data,
    meta:
      body.meta ?? {
        total: body.data.length,
        page: 1,
        limit: body.data.length,
        pages: 1,
      },
  };
}

export function qs(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const sp = new URLSearchParams();

  for (const [k, v] of Object.entries(params)) {
    if (
      v !== undefined &&
      v !== null &&
      v !== '' &&
      v !== false
    ) {
      sp.set(k, String(v));
    }
  }

  const s = sp.toString();
  return s ? `?${s}` : '';
}