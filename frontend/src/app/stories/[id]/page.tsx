'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  Clock3,
  FileText,
  Image as ImageIcon,
  LoaderCircle,
  MessageSquareText,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import { archiveStory, deleteStory, getStory, restoreStory } from '@/features/stories/story-api';
import { DeleteStoryDialog } from '@/features/stories/delete-story-dialog';
import { formatDate } from '@/features/stories/story-card';
import { getCoverClass, STORY_STATUS_LABELS, type Story } from '@/features/stories/story-types';
import { cn } from '@/lib/cn';

const futureSections = [
  { title: 'Chapters', detail: 'Start shaping your life into a book.', icon: FileText },
  {
    title: 'Memory vault',
    detail: 'Preserve memories, photographs and documents.',
    icon: ImageIcon,
    href: 'memories',
  },
  {
    title: 'Life interview',
    detail: 'Explore your life through thoughtful, source-aware questions.',
    icon: MessageSquareText,
    href: 'interviews',
  },
  {
    title: 'Timeline',
    detail: 'Arrange verified life events chronologically.',
    icon: CalendarDays,
    href: 'timeline',
  },
] as const;

export default function StoryOverviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { authenticatedRequest } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStory(await getStory(authenticatedRequest, params.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not open this story.');
    } finally {
      setLoading(false);
    }
  }, [authenticatedRequest, params.id]);

  useEffect(() => {
    let active = true;
    void getStory(authenticatedRequest, params.id)
      .then((result) => {
        if (active) setStory(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Could not open this story.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticatedRequest, params.id]);

  async function toggleArchive() {
    if (!story) return;
    setActing(true);
    setError(null);
    try {
      const updated =
        story.status === 'archived'
          ? await restoreStory(authenticatedRequest, story.id)
          : await archiveStory(authenticatedRequest, story.id);
      setStory(updated);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not update this story.');
    } finally {
      setActing(false);
    }
  }

  async function remove(selected: Story, confirmationTitle: string) {
    await deleteStory(authenticatedRequest, selected.id, confirmationTitle);
    router.replace('/stories');
  }

  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Link
          href="/stories"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to my stories
        </Link>

        {loading ? (
          <div className="mt-10 grid min-h-[32rem] place-items-center rounded-[2rem] border border-stroke bg-card">
            <LoaderCircle className="size-6 animate-spin text-brand" aria-label="Loading story" />
          </div>
        ) : error && !story ? (
          <div className="mt-10 rounded-[2rem] border border-stroke bg-card p-10 text-center">
            <h1 className="font-serif text-4xl font-semibold">This story could not be opened.</h1>
            <p className="mt-3 text-muted">{error}</p>
            <button type="button" onClick={() => void load()} className="button-primary mt-6">
              Try again
            </button>
          </div>
        ) : story ? (
          <>
            {error && (
              <p
                role="alert"
                className="mt-6 rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}
            <section className="mt-9 grid overflow-hidden rounded-[2rem] border border-stroke bg-card lg:grid-cols-[22rem_1fr]">
              <div
                className={cn(
                  'relative min-h-96 bg-gradient-to-br p-8',
                  getCoverClass(story.coverKey),
                  story.coverKey === 'linen' ? 'text-[#25302d]' : 'text-white',
                )}
              >
                <div className="absolute inset-y-0 left-0 w-2 bg-black/15" />
                <div className="flex h-full min-h-80 flex-col justify-between border border-current/25 p-6 text-center">
                  <span className="text-[0.62rem] font-bold tracking-[0.22em] opacity-70">
                    MY AUTOBIOGRAPHY
                  </span>
                  <div>
                    <h1 className="font-serif text-5xl font-semibold leading-[0.88] tracking-[-0.05em]">
                      {story.title}
                    </h1>
                    {story.subtitle && (
                      <p className="mt-5 text-sm leading-6 opacity-75">{story.subtitle}</p>
                    )}
                  </div>
                  <span className="font-serif italic opacity-70">A life remembered</span>
                </div>
              </div>
              <div className="flex flex-col justify-between p-7 sm:p-10">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                      {STORY_STATUS_LABELS[story.status]}
                    </span>
                    <span className="text-sm text-muted">{story.writingLanguage}</span>
                  </div>
                  <p className="mt-7 max-w-2xl text-lg leading-8 text-muted">
                    {story.description ||
                      'No description yet. Add one when you are ready to define what this autobiography will preserve.'}
                  </p>
                  <p className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-muted">
                    <Clock3 className="size-4" /> Updated {formatDate(story.updatedAt)}
                  </p>
                </div>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Link href={`/stories/${story.id}/edit`} className="button-primary">
                    <Pencil className="size-4" /> Edit story
                  </Link>
                  <button
                    type="button"
                    onClick={toggleArchive}
                    disabled={acting}
                    className="button-quiet"
                  >
                    {acting ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : story.status === 'archived' ? (
                      <RotateCcw className="size-4" />
                    ) : (
                      <Archive className="size-4" />
                    )}
                    {story.status === 'archived' ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(true)}
                    className="button-quiet text-red-600"
                  >
                    <Trash2 className="size-4" /> Delete
                  </button>
                </div>
              </div>
            </section>

            <section className="mt-10">
              <p className="eyebrow-text">Build your book</p>
              <h2 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.04em]">
                Your story workspace
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {futureSections.map(({ title, detail, icon: Icon, ...section }) => (
                  <article key={title} className="rounded-2xl border border-stroke bg-card p-6">
                    <span className="grid size-11 place-items-center rounded-xl bg-brand/8 text-brand">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-5 font-serif text-2xl font-semibold">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
                    {'href' in section ? (
                      <Link
                        href={`/stories/${story.id}/${section.href}`}
                        className="mt-5 inline-flex text-xs font-bold uppercase tracking-wider text-brand"
                      >
                        Open workspace →
                      </Link>
                    ) : (
                      <span className="mt-5 block text-xs font-bold uppercase tracking-wider text-muted">
                        Coming soon
                      </span>
                    )}
                  </article>
                ))}
              </div>
            </section>
            <DeleteStoryDialog
              story={deleting ? story : null}
              onClose={() => setDeleting(false)}
              onConfirm={remove}
            />
          </>
        ) : null}
      </main>
    </WorkspaceShell>
  );
}
