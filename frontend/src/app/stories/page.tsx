'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';

import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import { archiveStory, deleteStory, restoreStory } from '@/features/stories/story-api';
import { DeleteStoryDialog } from '@/features/stories/delete-story-dialog';
import { filterAndSortStories, type StorySort } from '@/features/stories/story-filters';
import { StoryCard } from '@/features/stories/story-card';
import { STORY_STATUS_LABELS, type Story, type StoryStatus } from '@/features/stories/story-types';
import { useStories } from '@/features/stories/use-stories';

export default function StoriesPage() {
  const { authenticatedRequest } = useAuth();
  const { stories, setStories, loading, error, refresh } = useStories();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StoryStatus | 'all'>('all');
  const [sort, setSort] = useState<StorySort>('updated_desc');
  const [actionError, setActionError] = useState<string | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);

  const visibleStories = useMemo(
    () => filterAndSortStories(stories, search, status, sort),
    [search, sort, status, stories],
  );

  async function archive(selected: Story) {
    setActionError(null);
    try {
      const updated = await archiveStory(authenticatedRequest, selected.id);
      replaceStory(updated);
    } catch (archiveError) {
      setActionError(
        archiveError instanceof Error ? archiveError.message : 'Could not archive the story.',
      );
    }
  }

  async function restore(selected: Story) {
    setActionError(null);
    try {
      const updated = await restoreStory(authenticatedRequest, selected.id);
      replaceStory(updated);
    } catch (restoreError) {
      setActionError(
        restoreError instanceof Error ? restoreError.message : 'Could not restore the story.',
      );
    }
  }

  async function remove(selected: Story, confirmationTitle: string) {
    await deleteStory(authenticatedRequest, selected.id, confirmationTitle);
    setStories((current) => current.filter((story) => story.id !== selected.id));
  }

  function replaceStory(updated: Story) {
    setStories((current) => current.map((story) => (story.id === updated.id ? updated : story)));
  }

  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-[100rem] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow-text">Your autobiography library</p>
            <h1 className="mt-3 font-serif text-5xl font-medium leading-none tracking-[-0.045em] sm:text-6xl">
              My stories
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted">
              Create and organize each life-story project independently. Your drafts remain private
              until you choose otherwise.
            </p>
          </div>
          <Link href="/stories/new" className="button-primary button-large self-start">
            <Plus className="size-4" /> New autobiography
          </Link>
        </div>

        {(error || actionError) && (
          <div
            role="alert"
            className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-700"
          >
            <span>{actionError ?? error}</span>
            {error && (
              <button type="button" onClick={refresh} className="font-bold underline">
                Try again
              </button>
            )}
          </div>
        )}

        <section
          className="mt-9 grid gap-3 rounded-2xl border border-stroke bg-card p-4 md:grid-cols-[1fr_auto_auto]"
          aria-label="Story filters"
        >
          <label className="relative block">
            <span className="sr-only">Search stories</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              className="form-input pl-10"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search titles and descriptions"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              className="form-input min-w-44"
              value={status}
              onChange={(event) => setStatus(event.target.value as StoryStatus | 'all')}
            >
              <option value="all">All statuses</option>
              {(Object.entries(STORY_STATUS_LABELS) as Array<[StoryStatus, string]>).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <label>
            <span className="sr-only">Sort stories</span>
            <select
              className="form-input min-w-48"
              value={sort}
              onChange={(event) => setSort(event.target.value as StorySort)}
            >
              <option value="updated_desc">Recently updated</option>
              <option value="created_desc">Recently created</option>
              <option value="title_asc">Title A–Z</option>
            </select>
          </label>
        </section>

        {loading ? (
          <div className="mt-8 grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-[25rem] animate-pulse rounded-[1.6rem] bg-card" />
            ))}
          </div>
        ) : visibleStories.length > 0 ? (
          <section
            className="mt-8 grid gap-6 md:grid-cols-2 2xl:grid-cols-3"
            aria-label="Autobiographies"
          >
            {visibleStories.map((story) => (
              <StoryCard
                key={story.id}
                story={story}
                onArchive={archive}
                onRestore={restore}
                onDelete={setStoryToDelete}
              />
            ))}
          </section>
        ) : stories.length === 0 ? (
          <section className="mt-8 grid min-h-[30rem] place-items-center rounded-[2rem] border border-dashed border-stroke bg-card px-6 text-center">
            <div className="max-w-md">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand/8 text-brand">
                <BookOpen className="size-6" />
              </span>
              <h2 className="mt-6 font-serif text-4xl font-semibold tracking-[-0.04em]">
                Your shelf is waiting.
              </h2>
              <p className="mt-4 leading-7 text-muted">
                Begin with a title and a simple description. You do not need to know the whole story
                yet.
              </p>
              <Link href="/stories/new" className="button-primary button-large mt-7">
                <Plus className="size-4" /> Create my first story
              </Link>
            </div>
          </section>
        ) : (
          <section className="mt-8 grid min-h-72 place-items-center rounded-[2rem] border border-dashed border-stroke bg-card px-6 text-center">
            <div>
              <Search className="mx-auto size-6 text-muted" />
              <h2 className="mt-4 font-serif text-3xl font-semibold">No matching stories</h2>
              <p className="mt-2 text-sm text-muted">Try a different search or status filter.</p>
            </div>
          </section>
        )}
      </main>
      <DeleteStoryDialog
        story={storyToDelete}
        onClose={() => setStoryToDelete(null)}
        onConfirm={remove}
      />
    </WorkspaceShell>
  );
}
