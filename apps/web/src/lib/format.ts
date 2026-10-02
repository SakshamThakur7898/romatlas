import type { Verification } from './types';

/** A VERIFIED record older than this is shown as OUTDATED. Keep in sync with the API threshold when sync lands. */
export const OUTDATED_AFTER_DAYS = 30;

export function timeAgo(iso?: string | null): string {
  if (!iso) return 'never';
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(seconds)) return 'unknown';
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return plural(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return plural(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return plural(days, 'day');
  if (days < 30) return plural(Math.floor(days / 7), 'week');
  if (days < 365) return plural(Math.floor(days / 30), 'month');
  return plural(Math.floor(days / 365), 'year');
}

export type Tone = 'ok' | 'warn' | 'muted';

export function freshness(status: Verification | undefined, lastVerifiedAt?: string | null): { text: string; tone: Tone } {
  const ageDays = lastVerifiedAt ? (Date.now() - new Date(lastVerifiedAt).getTime()) / 86_400_000 : Infinity;
  if (status === 'OUTDATED' || (status === 'VERIFIED' && ageDays > OUTDATED_AFTER_DAYS)) {
    return { text: 'Outdated', tone: 'warn' };
  }
  if (status === 'VERIFIED') return { text: `Verified ${timeAgo(lastVerifiedAt)}`, tone: 'ok' };
  if (status === 'COMMUNITY_REPORTED') return { text: 'Community reported', tone: 'muted' };
  return { text: 'Unverified', tone: 'muted' };
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
