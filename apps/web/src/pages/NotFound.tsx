import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/hooks';

export default function NotFound() {
  usePageMeta('Not found');
  return (
    <main className="mx-auto max-w-6xl px-4 py-24">
      <p className="font-mono text-xs tracking-widest text-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <Link to="/" className="mt-6 inline-block text-sm text-accent hover:underline">← Back to the index</Link>
    </main>
  );
}
