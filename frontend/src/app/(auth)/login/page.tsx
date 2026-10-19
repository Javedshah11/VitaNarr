import type { Metadata } from 'next';

import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = {
  title: 'Welcome back',
  description: 'Sign in to continue writing your VitaNarr story.',
};

export default function LoginPage() {
  return <LoginForm />;
}
