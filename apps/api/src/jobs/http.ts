import { logger } from '../utils/logger';

const UA = 'ROMAtlas/0.1 (+https://github.com/romatlas; source-linked Android index)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET with timeout and exponential-backoff retries on network errors, 429 and 5xx. */
export async function fetchBuffer(url: string, opts: { retries?: number; timeoutMs?: number } = {}): Promise<{ body: Buffer; status: number }> {
  const retries = opts.retries ?? 3;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
      });
      if (res.ok) return { body: Buffer.from(await res.arrayBuffer()), status: res.status };
      lastError = new Error(`HTTP ${res.status} for ${url}`);
      if (res.status !== 429 && res.status < 500) break; // client errors will not improve on retry
    } catch (err) {
      lastError = err;
    }
    if (attempt < retries) {
      const delay = 1000 * 2 ** attempt;
      logger.warn({ url, attempt: attempt + 1, delay }, 'fetch failed, retrying');
      await sleep(delay);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
