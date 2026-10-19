'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Bell,
  BookOpen,
  ChevronDown,
  Feather,
  FileText,
  HelpCircle,
  Home,
  Image as ImageIcon,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  X,
} from 'lucide-react';

import { useAuth } from '@/features/auth/auth-context';

import { Brand } from './brand';
import { ThemeToggle } from './theme-toggle';

export type WorkspaceSection = 'overview' | 'stories';

const navigation = [
  { label: 'Overview', icon: Home, href: '/dashboard', section: 'overview' },
  { label: 'My stories', icon: BookOpen, href: '/stories', section: 'stories' },
  { label: 'Memories', icon: ImageIcon },
  { label: 'Life interview', icon: MessageSquareText },
  { label: 'Chapters', icon: FileText },
] as const;

export function WorkspaceShell({
  active,
  children,
}: {
  active: WorkspaceSection;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [router, status]);

  async function handleLogout() {
    await logout();
    router.replace('/');
  }

  if (status === 'loading' || !user) {
    return <WorkspaceLoading />;
  }

  return (
    <div className="min-h-screen bg-surface text-foreground">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-stroke bg-card p-5 transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl hover:bg-surface lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="mt-10 space-y-1" aria-label="Workspace navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isAvailable = 'href' in item;
            const isCurrent = 'section' in item && item.section === active;
            const className = `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
              isCurrent
                ? 'bg-brand text-brand-foreground shadow-sm'
                : isAvailable
                  ? 'text-muted hover:bg-surface hover:text-foreground'
                  : 'cursor-not-allowed text-muted opacity-45'
            }`;

            return isAvailable ? (
              <Link
                key={item.label}
                href={item.href}
                className={className}
                onClick={() => setMenuOpen(false)}
              >
                <Icon className="size-[1.1rem]" aria-hidden="true" /> {item.label}
              </Link>
            ) : (
              <span key={item.label} className={className} title="Available in a future phase">
                <Icon className="size-[1.1rem]" aria-hidden="true" /> {item.label}
              </span>
            );
          })}
        </nav>
        <div className="mt-auto space-y-1 border-t border-stroke pt-5">
          <span className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted opacity-45">
            <HelpCircle className="size-[1.1rem]" /> Help & support
          </span>
          <span className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted opacity-45">
            <Settings className="size-[1.1rem]" /> Settings
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted hover:bg-surface hover:text-foreground"
          >
            <LogOut className="size-[1.1rem]" /> Sign out
          </button>
        </div>
      </aside>
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-evergreen/45 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-stroke bg-surface/85 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid size-10 place-items-center rounded-xl border border-stroke bg-card lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                disabled
                placeholder="Search your workspace"
                className="h-11 w-72 rounded-xl border border-stroke bg-card pl-10 pr-4 text-sm opacity-60 outline-none"
                aria-label="Global search, available in a future phase"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <span className="relative grid size-10 place-items-center rounded-full border border-stroke bg-card text-muted opacity-55">
              <Bell className="size-4" />
            </span>
            <div className="ml-1 hidden items-center gap-3 sm:flex">
              <span className="grid size-10 place-items-center rounded-full bg-brand font-serif text-lg font-bold text-brand-foreground">
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
              <div className="hidden xl:block">
                <p className="text-sm font-bold leading-tight">{user.displayName}</p>
                <p className="mt-1 text-xs text-muted">Storyteller</p>
              </div>
              <ChevronDown className="hidden size-4 text-muted xl:block" />
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function WorkspaceLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand text-brand-foreground">
          <Feather className="size-5 animate-pulse" />
        </span>
        <p className="mt-4 text-sm font-semibold text-muted">Opening your story workspace…</p>
      </div>
    </div>
  );
}
