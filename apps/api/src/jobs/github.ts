import { env } from '../config/env';

export interface GithubResult<T> {
  status: number;
  data: T | null;
  /** Remaining requests in the current rate-limit window, when GitHub reports it. */
  remaining: number | null;
  rateLimited: boolean;
}

/** Minimal GitHub REST GET. Uses GITHUB_TOKEN when set (60 req/h unauthenticated, 5000/h with a token). */
export async function githubGet<T>(path: string): Promise<GithubResult<T>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ROMAtlas/0.1 (+https://github.com/romatlas)',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;

  const res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(20_000) });
  const remainingHeader = res.headers.get('x-ratelimit-remaining');
  const remaining = remainingHeader === null ? null : Number(remainingHeader);
  const rateLimited = (res.status === 403 || res.status === 429) && remaining === 0;
  const data = res.ok ? ((await res.json()) as T) : null;
  return { status: res.status, data, remaining, rateLimited };
}
