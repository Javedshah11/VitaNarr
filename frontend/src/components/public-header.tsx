'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { useAuth } from '@/features/auth/auth-context';

import { Brand } from './brand';
import { ThemeToggle } from './theme-toggle';

export function PublicHeader() {
  const { status } = useAuth();

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex h-24 max-w-[90rem] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Brand />
        <nav
          className="hidden items-center gap-8 text-sm font-semibold text-muted md:flex"
          aria-label="Main navigation"
        >
          <a className="transition hover:text-foreground" href="#how-it-works">
            How it works
          </a>
          <a className="transition hover:text-foreground" href="#principles">
            Our promise
          </a>
          <a className="transition hover:text-foreground" href="#features">
            Features
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {status === 'authenticated' ? (
            <Link className="button-primary hidden sm:inline-flex" href="/dashboard">
              Dashboard <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link className="button-quiet hidden sm:inline-flex" href="/login">
                Sign in
              </Link>
              <Link className="button-primary" href="/register">
                Begin your story
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
