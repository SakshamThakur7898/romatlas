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

// Mirrors the server's registerSchema; the server remains the authority.
const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(80),
  username: z.string().min(3, 'At least 3 characters').max(30).regex(/^[a-z0-9_]+$/, 'Lowercase letters, digits and underscores only'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(128),
});
type Values = z.infer<typeof schema>;

export default function Register() {
  usePageMeta('Create account');
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const registerUser = useAuth((s) => s.register);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver<Values>(schema) });

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      await registerUser(v);
      navigate(next, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Registration failed.');
    }
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <p className="mb-2 font-mono text-xs tracking-widest text-accent">ACCOUNT</p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Create account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Name" error={errors.name?.message}><input autoComplete="name" className={inputClass} {...register('name')} /></Field>
        <Field label="Username" error={errors.username?.message}><input autoComplete="username" className={inputClass} {...register('username')} /></Field>
        <Field label="Email" error={errors.email?.message}><input type="email" autoComplete="email" className={inputClass} {...register('email')} /></Field>
        <Field label="Password" error={errors.password?.message}><input type="password" autoComplete="new-password" className={inputClass} {...register('password')} /></Field>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} w-full`}>{isSubmitting ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-sm text-muted">Already registered? <Link to={`/login?next=${encodeURIComponent(next)}`} className="text-accent hover:underline">Sign in</Link></p>
    </main>
  );
}
