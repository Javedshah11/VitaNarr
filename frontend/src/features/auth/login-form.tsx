'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { z } from 'zod';

import { useAuth } from './auth-context';

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [router, status]);

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    try {
      await login(values);
      router.replace('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Sign in failed.');
    }
  }

  return (
    <div>
      <p className="eyebrow-text">Your story is waiting</p>
      <h1 className="mt-4 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
        Welcome back.
      </h1>
      <p className="mt-4 leading-7 text-muted">
        Sign in to return to your private autobiography workspace.
      </p>

      <form className="mt-9 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            {formError}
          </div>
        )}
        <FormField label="Email address" error={errors.email?.message}>
          <input
            className="form-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <div className="relative">
            <input
              className="form-input pr-12"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </FormField>
        <button
          type="submit"
          disabled={isSubmitting}
          className="button-primary button-large w-full"
        >
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              Continue my story <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        New to VitaNarr?{' '}
        <Link href="/register" className="font-bold text-brand underline-offset-4 hover:underline">
          Create your account
        </Link>
      </p>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}
