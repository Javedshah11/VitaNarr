import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/features/auth/auth-context';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'VitaNarr — Your life, beautifully told',
    template: '%s | VitaNarr',
  },
  description:
    'Preserve your memories and shape them into a lasting autobiography with private, fact-grounded assistance.',
};

const themeScript = `
  try {
    const saved = localStorage.getItem('vitanarr-theme');
    const theme = saved === 'dark' || saved === 'light'
      ? saved
      : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  } catch {}
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
