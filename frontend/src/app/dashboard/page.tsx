'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Plus,
  Sparkles,
} from 'lucide-react';

import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import { STORY_STATUS_LABELS } from '@/features/stories/story-types';
import { useStories } from '@/features/stories/use-stories';

export default function DashboardPage() {
  const { user } = useAuth();
  const { stories, loading, error } = useStories();
  const firstName = user?.displayName.trim().split(/\s+/)[0] ?? 'storyteller';
  const activeStories = stories.filter((story) => story.status !== 'archived');
  const recentStories = stories.slice(0, 3);

  return (
    <WorkspaceShell active="overview">
      <main className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow-text">Your private workspace</p>
            <h1 className="mt-3 font-serif text-5xl font-medium leading-none tracking-[-0.045em] sm:text-6xl">
              Welcome, {firstName}.
            </h1>
            <p className="mt-4 max-w-xl leading-7 text-muted">
              Gather your autobiographies, return to a draft, or begin a new
              story whenever inspiration arrives.
            </p>
          </div>
          <Link
            href="/stories/new"
            className="button-primary button-large self-start md:self-auto"
          >
            <Plus className="size-4" /> Create a story
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section
          className="mt-9 grid gap-4 sm:grid-cols-3"
          aria-label="Story statistics"
        >
          <StatCard
            label="Stories"
            value={loading ? '—' : String(stories.length)}
            icon={BookOpen}
            note={`${activeStories.length} active`}
          />
          <StatCard label="Memories" value="0" icon={ImageIcon} note="Phase 4" />
          <StatCard label="Chapters" value="0" icon={FileText} note="Planned next" />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <section className="relative overflow-hidden rounded-[2rem] bg-evergreen p-7 text-paper sm:p-10">
            <div className="absolute -right-20 -top-28 size-80 rounded-full border border-accent/15" />
            <div className="absolute -bottom-40 right-16 size-72 rounded-full border border-accent/10" />
            <div className="relative max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-paper/15 bg-paper/5 px-3 py-1.5 text-xs font-bold text-accent">
                <Sparkles className="size-3.5" /> YOUR STORY LIBRARY
              </span>
              <h2 className="mt-7 font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
                {stories.length === 0
                  ? 'Your first autobiography starts here.'
                  : 'Every story has a place here.'}
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-paper/65">
                {stories.length === 0
                  ? 'Choose a title, a visual cover and the language you want to write in. You can refine every detail later.'
                  : 'Manage each autobiography independently, keep unfinished work private and archive projects without losing them.'}
              </p>
              <Link
                href={stories.length === 0 ? '/stories/new' : '/stories'}
                className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
              >
                {stories.length === 0 ? 'Create my first story' : 'Open my stories'}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </section>

          <section className="rounded-[2rem] border border-stroke bg-card p-7 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow-text">Recently updated</p>
                <h2 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.03em]">
                  Your stories
                </h2>
              </div>
              <BookOpen className="size-5 text-accent" />
            </div>
            {loading ? (
              <div className="mt-8 space-y-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-surface" />
                ))}
              </div>
            ) : recentStories.length > 0 ? (
              <div className="mt-7 space-y-2">
                {recentStories.map((story) => (
                  <Link
                    key={story.id}
                    href={`/stories/${story.id}`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-transparent p-3 hover:border-stroke hover:bg-surface"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{story.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {STORY_STATUS_LABELS[story.status]}
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-8 grid min-h-40 place-items-center rounded-2xl border border-dashed border-stroke bg-surface/60 px-6 text-center">
                <div>
                  <p className="font-bold">A fresh page</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Created stories will appear here.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </WorkspaceShell>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  note,
}: {
  label: string;
  value: string;
  icon: typeof BookOpen;
  note: string;
}) {
  return (
    <article className="rounded-2xl border border-stroke bg-card p-6 shadow-[0_14px_34px_rgba(23,61,56,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
            {label}
          </p>
          <p className="mt-2 font-serif text-5xl font-semibold tracking-[-0.04em]">
            {value}
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-brand/8 text-brand">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-xs text-muted">{note}</p>
    </article>
  );
}
