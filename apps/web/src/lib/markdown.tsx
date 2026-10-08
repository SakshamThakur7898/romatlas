import { Fragment, type ReactNode } from 'react';
import { slugify } from './slug';

/**
 * A small, safe Markdown subset for guides and AI answers: headings (#-###), paragraphs, ordered/unordered
 * lists, quotes, fenced code, `code`, **bold** and http(s) links. Output is React elements only, never raw HTML.
 */
export type Block =
  | { t: 'h'; level: 1 | 2 | 3; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'quote'; text: string }
  | { t: 'code'; text: string };

export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let para: string[] = [];
  let list: { t: 'ul' | 'ol'; items: string[] } | null = null;
  const flush = () => {
    if (para.length) { blocks.push({ t: 'p', text: para.join(' ') }); para = []; }
    if (list) { blocks.push(list); list = null; }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith('```'); i++) code.push(lines[i]);
      blocks.push({ t: 'code', text: code.join('\n') });
      continue;
    }
    const h = /^(#{1,3})\s+(.+?)\s*#*$/.exec(line);
    const ul = /^\s*[-*]\s+(.+)$/.exec(line);
    const ol = /^\s*\d+[.)]\s+(.+)$/.exec(line);
    const q = /^>\s?(.*)$/.exec(line);
    if (!line.trim()) flush();
    else if (h) { flush(); blocks.push({ t: 'h', level: h[1].length as 1 | 2 | 3, text: h[2] }); }
    else if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      if (para.length) flush();
      if (list && list.t !== kind) flush();
      list ??= { t: kind, items: [] };
      list.items.push((ul ?? ol)![1]);
    } else if (q) { flush(); blocks.push({ t: 'quote', text: q[1] }); }
    else { if (list) flush(); para.push(line.trim()); }
  }
  flush();
  return blocks;
}

export interface Heading { id: string; text: string; level: 1 | 2 | 3 }

export function headingsOf(blocks: Block[]): Heading[] {
  const seen = new Map<string, number>();
  const out: Heading[] = [];
  for (const b of blocks) {
    if (b.t !== 'h') continue;
    const base = slugify(b.text) || 'section';
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push({ id: n ? `${base}-${n}` : base, text: b.text, level: b.level });
  }
  return out;
}

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i} className="rounded bg-surface px-1 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part);
    if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">{link[1]}</a>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ source }: { source: string }) {
  const blocks = parseBlocks(source);
  const ids = headingsOf(blocks);
  let h = 0;
  return (
    <div className="space-y-4 text-[15px] leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': {
            const id = ids[h++].id;
            const cls = b.level === 1 ? 'text-2xl font-semibold' : b.level === 2 ? 'mt-8 border-b border-line pb-1 text-xl font-semibold' : 'mt-6 text-base font-semibold';
            const Tag = (`h${b.level + 1 > 3 ? 3 : b.level + 1}`) as 'h2' | 'h3';
            return <Tag key={i} id={id} className={`${cls} scroll-mt-20`}>{inline(b.text)}</Tag>;
          }
          case 'p': return <p key={i}>{inline(b.text)}</p>;
          case 'ul': return <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>;
          case 'ol': return <ol key={i} className="list-decimal space-y-1 pl-6">{b.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>;
          case 'quote': return <blockquote key={i} className="border-l-2 border-accent pl-4 text-muted">{inline(b.text)}</blockquote>;
          case 'code': return <pre key={i} className="overflow-x-auto rounded border border-line bg-surface p-3 font-mono text-xs">{b.text}</pre>;
        }
      })}
    </div>
  );
}
