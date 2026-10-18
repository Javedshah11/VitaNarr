import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, Check } from 'lucide-react';

import authImage from '../../../../docs/assets/Golden Sunrise Reading Retreat-12.png';
import { Brand } from '@/components/brand';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AuthenticationLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[minmax(26rem,0.9fr)_1.1fr]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <Image
          src={authImage}
          alt="An open book in a peaceful mountain landscape at sunrise"
          fill
          priority
          className="object-cover"
          sizes="45vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#102824]/95 via-[#102824]/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-paper xl:p-16">
          <p className="max-w-lg font-serif text-4xl font-medium leading-tight tracking-[-0.035em] xl:text-5xl">
            “There is no greater agony than bearing an untold story inside you.”
          </p>
          <p className="mt-5 text-sm font-semibold tracking-wide text-paper/65">MAYA ANGELOU</p>
          <div className="mt-10 flex flex-wrap gap-5 text-sm text-paper/75">
            <span className="inline-flex items-center gap-2">
              <Check className="size-4 text-accent" aria-hidden="true" /> Private workspace
            </span>
            <span className="inline-flex items-center gap-2">
              <Check className="size-4 text-accent" aria-hidden="true" /> You stay in control
            </span>
          </div>
        </div>
      </section>
      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-20">
        <div className="flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-2">
            <Link href="/" className="button-quiet hidden sm:inline-flex">
              <ArrowLeft className="size-4" aria-hidden="true" /> Home
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-14">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>
    </main>
  );
}
