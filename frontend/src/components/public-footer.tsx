import Link from 'next/link';

import { Brand } from './brand';

export function PublicFooter() {
  return (
    <footer className="border-t border-stroke bg-card">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] lg:px-12">
        <div>
          <Brand />
          <p className="mt-4 max-w-md text-sm leading-6 text-muted">
            A private place to gather your memories and shape them into a life story you can
            preserve.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-x-8 gap-y-3 text-sm font-semibold text-muted">
          <Link className="hover:text-foreground" href="/login">
            Sign in
          </Link>
          <Link className="hover:text-foreground" href="/register">
            Create account
          </Link>
          <a className="hover:text-foreground" href="#principles">
            Privacy promise
          </a>
        </div>
        <p className="text-xs text-muted md:col-span-2">
          © {new Date().getFullYear()} VitaNarr. Live it. Tell it. Preserve it.
        </p>
      </div>
    </footer>
  );
}
