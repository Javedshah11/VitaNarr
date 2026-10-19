'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';

import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import { getStory, updateStory } from '@/features/stories/story-api';
import { StoryForm } from '@/features/stories/story-form';
import type { Story, StoryInput } from '@/features/stories/story-types';

export default function EditStoryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { authenticatedRequest } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStory(await getStory(authenticatedRequest, params.id));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this story.');
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
          setError(loadError instanceof Error ? loadError.message : 'Could not load this story.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authenticatedRequest, params.id]);

  async function submit(input: StoryInput) {
    if (!story) return;
    setError(null);
    try {
      await updateStory(authenticatedRequest, story.id, input);
      router.push(`/stories/${story.id}`);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not save your changes.');
      throw updateError;
    }
  }

  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Link
          href={`/stories/${params.id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to story
        </Link>
        {loading ? (
          <div className="mt-10 grid min-h-96 place-items-center rounded-[2rem] border border-stroke bg-card">
            <LoaderCircle className="size-6 animate-spin text-brand" aria-label="Loading story" />
          </div>
        ) : story ? (
          <>
            <div className="mt-8">
              <p className="eyebrow-text">Story settings</p>
              <h1 className="mt-3 font-serif text-5xl font-medium leading-none tracking-[-0.045em] sm:text-6xl">
                Edit your autobiography.
              </h1>
              <p className="mt-4 max-w-2xl leading-7 text-muted">
                Refine the book details, cover, language or progress status.
              </p>
            </div>
            <div className="mt-9">
              <StoryForm story={story} onSubmit={submit} error={error} submitLabel="Save changes" />
            </div>
          </>
        ) : (
          <div className="mt-10 rounded-[2rem] border border-stroke bg-card p-10 text-center">
            <h1 className="font-serif text-4xl font-semibold">This story could not be edited.</h1>
            <p className="mt-3 text-muted">{error}</p>
            <button type="button" onClick={() => void load()} className="button-primary mt-6">
              Try again
            </button>
          </div>
        )}
      </main>
    </WorkspaceShell>
  );
}
