/** Only same-site absolute paths are valid post-login targets (blocks open redirects like //evil.com). */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/';
}
