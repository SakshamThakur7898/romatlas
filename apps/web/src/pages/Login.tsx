import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePageMeta } from '../lib/hooks';
import { safeNext } from '../lib/safeNext';
import { zodResolver } from '../lib/zodResolver';
import { Field, inputClass, primaryButtonClass } from '../components/ui';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
type Values = z.infer<typeof schema>;

export default function Login() {
  usePageMeta('Sign in');
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver<Values>(schema) });

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      await login(v.email, v.password);
      navigate(next, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign in failed.');
    }
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <p className="mb-2 font-mono text-xs tracking-widest text-accent">ACCOUNT</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Sign in</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email?.message}><input type="email" autoComplete="email" className={inputClass} {...register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}><input type="password" autoComplete="current-password" className={inputClass} {...register('password')} /></Field>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} w-full`}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-6 text-sm text-muted">No account? <Link to={`/register?next=${encodeURIComponent(next)}`} className="text-accent hover:underline">Create one</Link></p>
    </main>
  );
}
