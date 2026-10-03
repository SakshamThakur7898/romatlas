import { Link } from 'react-router-dom';
import type { SupportWithDevice, SupportWithRom } from '../lib/types';
import { ExternalLink, LifecycleBadge, Mono, SupportBadge, VerificationBadge } from './ui';

type Row =
  | { kind: 'rom'; s: SupportWithRom }
  | { kind: 'device'; s: SupportWithDevice };

function name(r: Row) {
  return r.kind === 'rom' ? r.s.romId?.name ?? 'Unknown ROM' : r.s.deviceId?.name ?? 'Unknown device';
}
function href(r: Row) {
  if (r.kind === 'rom') return r.s.romId ? `/roms/${r.s.romId.slug}` : undefined;
  return r.s.deviceId ? `/devices/${r.s.deviceId.brandSlug}/${r.s.deviceId.slug}` : undefined;
}
function sub(r: Row) {
  return r.kind === 'device' && r.s.deviceId ? <Mono>{r.s.deviceId.codename}</Mono> : null;
}

export function CompatibilityTable({ rows, firstColumn }: { rows: Row[]; firstColumn: 'ROM' | 'DEVICE' }) {
  const title = (r: Row) => {
    const to = href(r);
    return to ? <Link to={to} className="font-medium hover:text-accent">{name(r)}</Link> : <span className="font-medium">{name(r)}</span>;
  };
  return (
    <>
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-line text-left font-mono text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-4 font-normal">{firstColumn}</th>
            <th className="py-2 pr-4 font-normal">Android</th>
            <th className="py-2 pr-4 font-normal">Support</th>
            <th className="py-2 pr-4 font-normal">Verification</th>
            <th className="py-2 font-normal">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.s._id} className="border-b border-line align-top">
              <td className="py-3 pr-4">
                {title(r)}
                {sub(r) && <div className="text-xs text-muted">{sub(r)}</div>}
              </td>
              <td className="py-3 pr-4"><Mono>{r.s.androidVersion}</Mono></td>
              <td className="py-3 pr-4"><span className="flex flex-wrap gap-1"><SupportBadge type={r.s.supportType} /><LifecycleBadge value={r.s.lifecycle} /></span></td>
              <td className="py-3 pr-4"><VerificationBadge status={r.s.verificationStatus} lastVerifiedAt={r.s.lastVerifiedAt} /></td>
              <td className="py-3"><ExternalLink href={r.s.sourceUrl}>Source</ExternalLink></td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.s._id} className="rounded border border-line bg-surface p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                {title(r)}
                {sub(r) && <div className="text-xs text-muted">{sub(r)}</div>}
              </div>
              <Mono>Android {r.s.androidVersion}</Mono>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SupportBadge type={r.s.supportType} />
              <LifecycleBadge value={r.s.lifecycle} />
              <VerificationBadge status={r.s.verificationStatus} lastVerifiedAt={r.s.lastVerifiedAt} />
            </div>
            <div className="mt-2 text-sm"><ExternalLink href={r.s.sourceUrl}>Open source</ExternalLink></div>
          </li>
        ))}
      </ul>
    </>
  );
}
