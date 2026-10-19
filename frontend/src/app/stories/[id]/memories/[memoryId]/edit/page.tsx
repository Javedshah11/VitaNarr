'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import { getMemory, updateMemory } from '@/features/memories/memory-api';
import { MemoryForm } from '@/features/memories/memory-form';
import type { Memory, MemoryInput } from '@/features/memories/memory-types';
export default function EditMemoryPage() {
  const { id: storyId, memoryId } = useParams<{ id: string; memoryId: string }>();
  const router = useRouter();
  const { authenticatedRequest } = useAuth();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getMemory(authenticatedRequest, memoryId)
      .then((item) => {
        if (active) setMemory(item);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load memory.');
      });
    return () => {
      active = false;
    };
  }, [authenticatedRequest, memoryId]);
  async function submit(input: MemoryInput) {
    try {
      await updateMemory(authenticatedRequest, memoryId, input);
      router.push(`/stories/${storyId}/memories/${memoryId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save changes.');
      throw reason;
    }
  }
  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-4xl px-5 py-8 sm:px-8 lg:py-10">
        <Link
          href={`/stories/${storyId}/memories/${memoryId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted"
        >
          <ArrowLeft className="size-4" /> Back to memory
        </Link>
        <h1 className="mt-8 font-serif text-5xl font-medium tracking-[-0.045em]">Edit memory.</h1>
        <section className="mt-8 rounded-[2rem] border border-stroke bg-card p-6 sm:p-8">
          {memory ? (
            <MemoryForm
              memory={memory}
              onSubmit={submit}
              error={error}
              submitLabel="Save changes"
            />
          ) : error ? (
            <p className="text-red-700">{error}</p>
          ) : (
            <LoaderCircle className="mx-auto animate-spin text-brand" />
          )}
        </section>
      </main>
    </WorkspaceShell>
  );
}
