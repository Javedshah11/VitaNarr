'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { ArrowRight, Check, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { z } from 'zod';

import { useAuth } from './auth-context';

const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Enter at least 2 characters.').max(120),
    email: z.email('Enter a valid email address.'),
    password: z.string().min(12, 'Use at least 12 characters.').max(128),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register: createAccount, status } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });
  const password = useWatch({ control, name: 'password' });

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [router, status]);

  async function onSubmit(values: RegisterValues) {
    setFormError(null);
    try {
      await createAccount({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      });
      router.replace('/dashboard');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Account creation failed.');
    }
  }

  return (
    <div>
      <p className="eyebrow-text">Begin with one memory</p>
      <h1 className="mt-4 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
        Create your space.
      </h1>
      <p className="mt-4 leading-7 text-muted">
        A private home for the moments, people and chapters that shaped your life.
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            {formError}
          </div>
        )}
        <Field label="Your name" error={errors.displayName?.message}>
          <input
            className="form-input"
            autoComplete="name"
            placeholder="How should we greet you?"
            {...register('displayName')}
          />
        </Field>
        <Field label="Email address" error={errors.email?.message}>
          <input
            className="form-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </Field>
        <Field label="Create a password" error={errors.password?.message}>
          <div className="relative">
            <input
              className="form-input pr-12"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 12 characters"
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
          <span
            className={`mt-2 flex items-center gap-2 text-xs ${password.length >= 12 ? 'text-brand' : 'text-muted'}`}
          >
            <Check className="size-3.5" aria-hidden="true" /> 12 or more characters
          </span>
        </Field>
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <input
            className="form-input"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            {...register('confirmPassword')}
          />
        </Field>
        <button
          type="submit"
          disabled={isSubmitting}
          className="button-primary button-large w-full"
        >
          {isSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <>
              Create my VitaNarr <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
      <p className="mt-6 text-center text-xs leading-5 text-muted">
        By creating an account, you agree to keep your login secure. Privacy controls and
        data-management terms will be finalized before production launch.
      </p>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-brand underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
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
