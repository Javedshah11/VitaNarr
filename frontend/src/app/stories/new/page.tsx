'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import { createStory } from '@/features/stories/story-api';
import { StoryForm } from '@/features/stories/story-form';
import type { StoryInput } from '@/features/stories/story-types';

export default function NewStoryPage() {
  const router = useRouter();
  const { authenticatedRequest } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function submit(input: StoryInput) {
    setError(null);
    try {
      const story = await createStory(authenticatedRequest, input);
      router.push(`/stories/${story.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create your story.');
      throw createError;
    }
  }

  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Link
          href="/stories"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to my stories
        </Link>
        <div className="mt-8">
          <p className="eyebrow-text">A new beginning</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl font-medium leading-none tracking-[-0.045em] sm:text-6xl">
            Create your autobiography.
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted">
            Set the identity of your story. Every field except the title can be changed later.
          </p>
        </div>
        <div className="mt-9">
          <StoryForm onSubmit={submit} error={error} submitLabel="Create autobiography" />
        </div>
      </main>
    </WorkspaceShell>
  );
}
