import type { Metadata } from 'next';

import { RegisterForm } from '@/features/auth/register-form';

export const metadata: Metadata = {
  title: 'Begin your story',
  description: 'Create your private VitaNarr storytelling workspace.',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
