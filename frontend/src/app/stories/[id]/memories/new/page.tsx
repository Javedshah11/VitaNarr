'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import { createMemory } from '@/features/memories/memory-api';
import { MemoryForm } from '@/features/memories/memory-form';
import type { MemoryInput } from '@/features/memories/memory-types';
export default function NewMemoryPage() {
  const { id: storyId } = useParams<{ id: string }>();
  const router = useRouter();
  const { authenticatedRequest } = useAuth();
  const [error, setError] = useState<string | null>(null);
  async function submit(input: MemoryInput) {
    try {
      const memory = await createMemory(authenticatedRequest, storyId, input);
      router.push(`/stories/${storyId}/memories/${memory.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this memory.');
      throw reason;
    }
  }
  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-10">
        <Link
          href={`/stories/${storyId}/memories`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted"
        >
          <ArrowLeft className="size-4" /> Memory vault
        </Link>
        <div className="mt-8">
          <p className="eyebrow-text">Record it faithfully</p>
          <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em]">
            Add a memory.
          </h1>
          <p className="mt-4 text-muted">
            Write naturally. Only the title and your description are required.
          </p>
        </div>
        <section className="mt-8 rounded-[2rem] border border-stroke bg-card p-6 sm:p-8">
          <MemoryForm onSubmit={submit} error={error} submitLabel="Save memory" />
        </section>
      </main>
    </WorkspaceShell>
  );
}
