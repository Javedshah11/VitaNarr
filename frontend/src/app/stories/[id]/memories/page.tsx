'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Grid2X2, List, MapPin, Plus, Search } from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import { listMemories } from '@/features/memories/memory-api';
import {
  CATEGORY_LABELS,
  MEMORY_CATEGORIES,
  type Memory,
  type MemoryCategory,
} from '@/features/memories/memory-types';
import { cn } from '@/lib/cn';
export default function MemoryVaultPage() {
  const { id: storyId } = useParams<{ id: string }>();
  const { authenticatedRequest } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<MemoryCategory | 'all'>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<'event' | 'created'>('event');
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({
        pageSize: '100',
        sort: sort === 'event' ? 'eventDate' : 'createdAt',
        order: 'desc',
      });
      if (search.trim()) query.set('search', search.trim());
      if (category !== 'all') query.set('category', category);
      void listMemories(authenticatedRequest, storyId, query.toString())
        .then((page) => {
          if (active) {
            setMemories(page.items);
            setError(null);
          }
        })
        .catch((reason: unknown) => {
          if (active)
            setError(reason instanceof Error ? reason.message : 'Could not load memories.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [authenticatedRequest, category, search, sort, storyId]);
  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Link
          href={`/stories/${storyId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to story
        </Link>
        <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow-text">Personal source library</p>
            <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
              Memory vault
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted">
              Preserve experiences in your own words. VitaNarr keeps dates as precise—or
              uncertain—as you provide them.
            </p>
          </div>
          <Link
            href={`/stories/${storyId}/memories/new`}
            className="button-primary button-large self-start"
          >
            <Plus className="size-4" /> Add memory
          </Link>
        </div>
        <section className="mt-8 grid gap-3 rounded-2xl border border-stroke bg-card p-4 lg:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              className="form-input pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories, places and tags"
            />
          </label>
          <select
            className="form-input min-w-44"
            value={category}
            onChange={(e) => setCategory(e.target.value as MemoryCategory | 'all')}
          >
            <option value="all">All categories</option>
            {MEMORY_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
          <select
            className="form-input min-w-44"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'event' | 'created')}
          >
            <option value="event">Event date</option>
            <option value="created">Recently added</option>
          </select>
          <div className="flex rounded-xl border border-stroke p-1">
            <button
              className={cn(
                'grid size-9 place-items-center rounded-lg',
                view === 'grid' && 'bg-brand text-white',
              )}
              onClick={() => setView('grid')}
              aria-label="Grid view"
            >
              <Grid2X2 className="size-4" />
            </button>
            <button
              className={cn(
                'grid size-9 place-items-center rounded-lg',
                view === 'list' && 'bg-brand text-white',
              )}
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <List className="size-4" />
            </button>
          </div>
        </section>
        {error && (
          <p className="mt-6 rounded-xl border border-red-500/25 bg-red-500/8 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : memories.length ? (
          <section
            className={cn(
              'mt-8 grid gap-5',
              view === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1',
            )}
          >
            {memories.map((memory) => (
              <Link
                key={memory.id}
                href={`/stories/${storyId}/memories/${memory.id}`}
                className="group rounded-2xl border border-stroke bg-card p-6 transition hover:-translate-y-0.5 hover:border-accent"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-brand/8 px-3 py-1 text-xs font-bold text-brand">
                    {CATEGORY_LABELS[memory.category]}
                  </span>
                  <span className="text-xs text-muted">{formatMemoryDate(memory)}</span>
                </div>
                <h2 className="mt-5 font-serif text-3xl font-semibold tracking-[-0.03em]">
                  {memory.title}
                </h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                  {memory.description}
                </p>
                {memory.location && (
                  <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted">
                    <MapPin className="size-3.5" />
                    {memory.location}
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2">
                  {memory.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="rounded-md bg-surface px-2 py-1 text-xs text-muted">
                      #{tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <section className="mt-8 grid min-h-80 place-items-center rounded-[2rem] border border-dashed border-stroke bg-card p-8 text-center">
            <div>
              <h2 className="font-serif text-4xl font-semibold">
                Every life begins with one remembered moment.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-muted">
                Add a childhood scene, a turning point, or a small detail you never want to lose.
              </p>
              <Link href={`/stories/${storyId}/memories/new`} className="button-primary mt-6">
                <Plus className="size-4" /> Add your first memory
              </Link>
            </div>
          </section>
        )}
      </main>
    </WorkspaceShell>
  );
}
export function formatMemoryDate(memory: Pick<Memory, 'eventDate' | 'datePrecision'>) {
  if (!memory.eventDate || memory.datePrecision === 'unknown') return 'Date unknown';
  const date = new Date(`${memory.eventDate}T00:00:00`);
  if (memory.datePrecision === 'year') return `${date.getFullYear()}`;
  if (memory.datePrecision === 'month')
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
  const text = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  return memory.datePrecision === 'approximate' ? `Around ${text}` : text;
}
