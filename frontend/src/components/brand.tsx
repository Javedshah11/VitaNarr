import Link from 'next/link';
import { Feather } from 'lucide-react';

import { cn } from '@/lib/cn';

export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn('inline-flex items-center gap-3', className)}
      aria-label="VitaNarr home"
    >
      <span className="grid size-10 place-items-center rounded-full border border-accent/50 bg-brand text-brand-foreground shadow-sm">
        <Feather className="size-4" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="font-serif text-[1.7rem] font-semibold tracking-[-0.04em] text-foreground">
          VitaNarr
        </span>
      )}
    </Link>
  );
}
