import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ApiError, apiPost } from '../lib/api';
import { usePageMeta } from '../lib/hooks';
import { Markdown } from '../lib/markdown';
import { Badge, ExternalLink, Mono, SectionTitle, buttonClass, inputClass, primaryButtonClass } from '../components/ui';
import { VerificationBadge, SupportBadge, LifecycleBadge } from '../components/ui';

interface Records {
  romSupport: { rom?: string; supportType: 'OFFICIAL' | 'COMMUNITY' | 'UNOFFICIAL' | 'UNKNOWN'; androidVersion: string; lifecycle?: 'ACTIVE' | 'DISCONTINUED' | 'UNKNOWN'; verificationStatus: 'VERIFIED' | 'COMMUNITY_REPORTED' | 'OUTDATED' | 'UNVERIFIED'; lastVerifiedAt?: string }[];
  recoveries: { name: string; version?: string }[];
  kernels: { name: string; version?: string }[];
  guides: { title: string }[];
}
interface Answer {
  answer: string;
  device: { id: string; name: string; codename: string } | null;
  records: Records | null;
  sources: { label: string; url: string }[];
  usedAi: boolean;
  model: string | null;
}
interface Exchange { question: string; result?: Answer; error?: string }

const EXAMPLES = [
  'What ROM options are currently listed for my POCO X3 NFC?',
  'Which recoveries are listed for the OnePlus 8?',
  'Is LineageOS listed for the Galaxy S21?',
];

function Result({ r }: { r: Answer }) {
  return (
    <div className="space-y-6">
      {r.device && <p className="text-sm">Device: <strong>{r.device.name}</strong> <Mono>{r.device.codename}</Mono></p>}

      {r.records && (
        <section aria-label="Database information">
          <SectionTitle>Database information</SectionTitle>
          {r.records.romSupport.length === 0 ? <p className="text-sm text-muted">No ROM support records.</p> : (
            <ul className="divide-y divide-line border-y border-line text-sm">
              {r.records.romSupport.map((s, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-medium">{s.rom ?? 'ROM'} <Mono>Android {s.androidVersion}</Mono></span>
                  <span className="flex flex-wrap items-center gap-1"><SupportBadge type={s.supportType} /><LifecycleBadge value={s.lifecycle} /><VerificationBadge status={s.verificationStatus} lastVerifiedAt={s.lastVerifiedAt} /></span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">{r.records.recoveries.length} recoveries · {r.records.kernels.length} kernels · {r.records.guides.length} guides on record</p>
        </section>
      )}

      {r.sources.length > 0 && (
        <section aria-label="Sources">
          <SectionTitle>Source links</SectionTitle>
          <ul className="space-y-1 text-sm">{r.sources.map((s) => <li key={s.url} className="flex flex-wrap justify-between gap-2"><span>{s.label}</span><ExternalLink href={s.url}>{new URL(s.url).hostname}</ExternalLink></li>)}</ul>
        </section>
      )}

      <section aria-label="Explanation">
        <SectionTitle>{r.usedAi ? 'AI-generated explanation' : 'Result'}</SectionTitle>
        {r.usedAi ? (
          <>
            <Markdown source={r.answer} />
            <p className="mt-3 text-xs text-muted">Generated from the records above{r.model ? ` by ${r.model}` : ''}. Check the sources before changing your device.</p>
          </>
        ) : (
          <>
            <p className="text-sm">{r.answer}</p>
            <p className="mt-2 text-xs text-muted">No AI was used: ROMAtlas has no records to base an answer on.</p>
          </>
        )}
      </section>
    </div>
  );
}

export default function Assistant() {
  usePageMeta('Device Assistant', 'Ask about ROMs, recoveries and kernels listed for your device. Answers use only ROMAtlas records.');
  const [params] = useSearchParams();
  const deviceId = params.get('device') ?? undefined;
  const deviceName = params.get('name') ?? undefined;
  const [text, setText] = useState('');
  const [log, setLog] = useState<Exchange[]>([]);

  const ask = useMutation({
    mutationFn: (question: string) => apiPost<Answer>('/ai/ask', { query: question, ...(deviceId && /^[a-f\d]{24}$/i.test(deviceId) ? { deviceId } : {}) }),
    onMutate: (question) => setLog((l) => [{ question }, ...l]),
    onSuccess: (result, question) => setLog((l) => l.map((e) => (e.question === question && !e.result && !e.error ? { ...e, result } : e))),
    onError: (err, question) => setLog((l) => l.map((e) => (e.question === question && !e.result && !e.error ? { ...e, error: err instanceof ApiError ? err.message : 'The assistant could not answer.' } : e))),
  });
  const submit = (q: string) => { const t = q.trim(); if (t && !ask.isPending) { ask.mutate(t); setText(''); } };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-2 font-mono text-xs tracking-widest text-accent">DEVICE ASSISTANT</p>
      <h1 className="text-3xl font-semibold tracking-tight">Ask about your device</h1>
      <p className="mt-2 text-sm text-muted">The assistant finds your device first, then answers only from ROMAtlas records and shows you those records and their sources. If ROMAtlas has nothing verified, it says so.</p>
      {deviceName && <p className="mt-3 text-sm">Asking about <Badge>{deviceName}</Badge> <Link to="/assistant" className="ml-2 text-accent hover:underline">clear</Link></p>}

      <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(text); }}>
        <input className={inputClass} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-label="Your question" placeholder={deviceName ? `Ask about ${deviceName}…` : 'e.g. Which ROMs are listed for the POCO X3 NFC?'} />
        <button type="submit" className={primaryButtonClass} disabled={ask.isPending || !text.trim()}>{ask.isPending ? 'Asking…' : 'Ask'}</button>
      </form>
      {log.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((e) => <button key={e} className={buttonClass} onClick={() => submit(e)}>{e}</button>)}
        </div>
      )}

      <div className="mt-8 space-y-8">
        {log.map((e, i) => (
          <article key={log.length - i} className="fade-in rounded border border-line bg-surface p-5">
            <p className="mb-4 text-sm font-medium">“{e.question}”</p>
            {!e.result && !e.error && <p className="text-sm text-muted">Looking up records…</p>}
            {e.error && <p role="alert" className="text-sm text-accent">{e.error}</p>}
            {e.result && <Result r={e.result} />}
          </article>
        ))}
      </div>
    </main>
  );
}
