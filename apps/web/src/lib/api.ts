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

async function request<T>(path: string): Promise<{ data: T; meta?: PageMeta }> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { credentials: 'include' });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Cannot reach the ROMAtlas API. Check your connection.', 0);
  }
  let body: Body<T>;
  try {
    body = (await res.json()) as Body<T>;
  } catch {
    throw new ApiError('BAD_RESPONSE', 'The server returned an unexpected response.', res.status);
  }
  if (!body.success) throw new ApiError(body.error.code, body.error.message, res.status);
  return body;
}

export async function apiGet<T>(path: string): Promise<T> {
  return (await request<T>(path)).data;
}

export async function apiGetPage<T>(path: string): Promise<Paged<T>> {
  const body = await request<T[]>(path);
  return { data: body.data, meta: body.meta ?? { total: body.data.length, page: 1, limit: body.data.length, pages: 1 } };
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== false) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
