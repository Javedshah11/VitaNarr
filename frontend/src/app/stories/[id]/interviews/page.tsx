'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Clock3, LoaderCircle, MessageSquareText, Plus, Sparkles } from 'lucide-react';

import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import { listInterviews, startInterview } from '@/features/interviews/interview-api';
import type { InterviewSession } from '@/features/interviews/interview-types';
import { getStory } from '@/features/stories/story-api';
import type { Story } from '@/features/stories/story-types';

export default function InterviewHomePage() {
  const { id: storyId } = useParams<{ id: string }>();
  const router = useRouter();
  const { authenticatedRequest } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [focusArea, setFocusArea] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([getStory(authenticatedRequest, storyId), listInterviews(authenticatedRequest, storyId)])
      .then(([storyResult, sessionPage]) => {
        if (active) {
          setStory(storyResult);
          setSessions(sessionPage.items);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not open interviews.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authenticatedRequest, storyId]);

  async function create() {
    setCreating(true);
    setError(null);
    try {
      const session = await startInterview(authenticatedRequest, storyId, {
        focusArea: focusArea.trim() || undefined,
        language: story?.writingLanguage ?? 'English',
      });
      router.push(`/stories/${storyId}/interviews/${session.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not start the interview.');
      setCreating(false);
    }
  }

  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Link href={`/stories/${storyId}`} className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to story
        </Link>

        <section className="relative mt-8 overflow-hidden rounded-[2rem] bg-evergreen px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-14">
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#d9bd8b]">
              <Sparkles className="size-4" /> VitaNarr AI interview
            </span>
            <h1 className="mt-5 font-serif text-5xl font-medium tracking-[-0.05em] sm:text-6xl">
              Your story, in your own words.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
              Thoughtful questions help you remember. Your original answers stay preserved, and nothing becomes a memory until you approve it.
            </p>
            <button type="button" onClick={() => setShowStart(true)} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#c5a36a] px-5 text-sm font-extrabold text-[#102824] hover:bg-[#d4b77f]">
              <Plus className="size-4" /> Start a new interview
            </button>
          </div>
        </section>

        {error && <p role="alert" className="mt-6 rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-700">{error}</p>}

        <section className="mt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow-text">Interview history</p>
              <h2 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em]">Continue the conversation</h2>
            </div>
            <span className="text-sm font-semibold text-muted">{sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}</span>
          </div>
          {loading ? (
            <div className="mt-6 grid min-h-56 place-items-center rounded-2xl border border-stroke bg-card">
              <LoaderCircle className="size-6 animate-spin text-brand" aria-label="Loading interviews" />
            </div>
          ) : sessions.length ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {sessions.map((session) => (
                <Link key={session.id} href={`/stories/${storyId}/interviews/${session.id}`} className="group rounded-2xl border border-stroke bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand"><MessageSquareText className="size-5" /></span>
                    <StatusBadge status={session.status} />
                  </div>
                  <h3 className="mt-5 font-serif text-2xl font-semibold">{session.focusArea || 'My life story interview'}</h3>
                  <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-muted"><Clock3 className="size-3.5" /> Updated {new Date(session.updatedAt).toLocaleDateString()}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand">{session.status === 'completed' ? 'Review interview' : 'Continue interview'} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-stroke bg-card px-6 py-14 text-center">
              <MessageSquareText className="mx-auto size-8 text-brand" />
              <h3 className="mt-4 font-serif text-3xl font-semibold">Begin with one remembered moment.</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted">There is no required order. VitaNarr will follow the details you choose to share.</p>
            </div>
          )}
        </section>

        {showStart && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-evergreen/60 p-4 backdrop-blur-sm" role="presentation">
            <form onSubmit={(event) => { event.preventDefault(); void create(); }} className="w-full max-w-lg rounded-[2rem] bg-card p-7 shadow-2xl sm:p-9" aria-labelledby="start-interview-title">
              <p className="eyebrow-text">A gentle beginning</p>
              <h2 id="start-interview-title" className="mt-3 font-serif text-4xl font-semibold">What would you like to explore?</h2>
              <p className="mt-3 text-sm leading-6 text-muted">This is optional. Leave it blank for a broad life interview.</p>
              <label className="mt-6 block">
                <span className="mb-2 block text-sm font-bold">Focus area</span>
                <input autoFocus maxLength={100} className="form-input" value={focusArea} onChange={(event) => setFocusArea(event.target.value)} placeholder="For example, school years or family traditions" />
              </label>
              <div className="mt-7 flex justify-end gap-3">
                <button type="button" onClick={() => setShowStart(false)} className="button-quiet">Cancel</button>
                <button disabled={creating} className="button-primary">{creating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Begin interview</button>
              </div>
            </form>
          </div>
        )}
      </main>
    </WorkspaceShell>
  );
}

function StatusBadge({ status }: { status: InterviewSession['status'] }) {
  const labels = { active: 'In progress', paused: 'Paused', completed: 'Completed' };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === 'active' ? 'bg-emerald-500/12 text-emerald-700' : status === 'paused' ? 'bg-amber-500/12 text-amber-700' : 'bg-brand/10 text-brand'}`}>{labels[status]}</span>;
}
