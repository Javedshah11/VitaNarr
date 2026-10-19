'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react';

import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import {
  approveExtraction,
  enqueueExtraction,
  enqueueQuestion,
  getAiJob,
  getInterview,
  getProgress,
  listExtractions,
  recordAnswer,
  rejectExtraction,
  retryAiJob,
  transitionInterview,
  updateExtraction,
  updateTopic,
} from '@/features/interviews/interview-api';
import type {
  AiJob,
  ExtractionCandidate,
  InterviewSession,
  TopicCoverage,
} from '@/features/interviews/interview-types';
import { CATEGORY_LABELS, MEMORY_CATEGORIES, type MemoryCategory } from '@/features/memories/memory-types';

const terminalJobStates = new Set(['completed', 'failed', 'cancelled']);

export default function InterviewWorkspacePage() {
  const { id: storyId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const { authenticatedRequest } = useAuth();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [progress, setProgress] = useState<TopicCoverage[]>([]);
  const [suggestions, setSuggestions] = useState<ExtractionCandidate[]>([]);
  const [job, setJob] = useState<AiJob | null>(null);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const conversationEnd = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    const [conversation, coverage, extracted] = await Promise.all([
      getInterview(authenticatedRequest, sessionId),
      getProgress(authenticatedRequest, sessionId),
      listExtractions(authenticatedRequest, sessionId),
    ]);
    setSession(conversation);
    setProgress(coverage);
    setSuggestions(extracted);
  }, [authenticatedRequest, sessionId]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      getInterview(authenticatedRequest, sessionId),
      getProgress(authenticatedRequest, sessionId),
      listExtractions(authenticatedRequest, sessionId),
    ])
      .then(([conversation, coverage, extracted]) => {
        if (!active) return;
        setSession(conversation);
        setProgress(coverage);
        setSuggestions(extracted);
      })
      .catch((reason: unknown) => active && setError(reason instanceof Error ? reason.message : 'Could not open this interview.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [authenticatedRequest, sessionId]);

  useEffect(() => {
    const savedId = window.localStorage.getItem(jobStorageKey(sessionId));
    if (!savedId) return;
    void getAiJob(authenticatedRequest, savedId)
      .then((savedJob) => {
        setJob(savedJob);
        if (savedJob.status === 'completed' || savedJob.status === 'cancelled') {
          window.localStorage.removeItem(jobStorageKey(sessionId));
        }
      })
      .catch(() => window.localStorage.removeItem(jobStorageKey(sessionId)));
  }, [authenticatedRequest, sessionId]);

  useEffect(() => {
    if (!job || terminalJobStates.has(job.status)) return;
    const timer = window.setInterval(() => {
      void getAiJob(authenticatedRequest, job.id)
        .then(async (current) => {
          setJob(current);
          if (terminalJobStates.has(current.status)) {
            if (current.status !== 'failed') window.localStorage.removeItem(jobStorageKey(sessionId));
            if (current.status === 'completed') await reload();
          }
        })
        .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not check AI progress.'));
    }, 2_000);
    return () => window.clearInterval(timer);
  }, [authenticatedRequest, job, reload, sessionId]);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [session?.questions?.length]);

  async function submitAnswer(skipped = false) {
    const current = session?.questions?.at(-1);
    if (!current || current.answer || session?.status !== 'active') return;
    if (!skipped && answer.trim().length < 2) {
      setError('Write a little more before sending your answer.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await recordAnswer(authenticatedRequest, sessionId, {
        questionId: current.id,
        content: skipped ? undefined : answer.trim(),
        skipped,
      });
      setSession(updated);
      setAnswer('');
      const queued = await enqueueQuestion(authenticatedRequest, sessionId);
      trackJob(queued);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save your answer.');
    } finally {
      setBusy(false);
    }
  }

  function trackJob(next: AiJob) {
    setJob(next);
    window.localStorage.setItem(jobStorageKey(sessionId), next.id);
  }

  async function changeLifecycle(action: 'pause' | 'resume' | 'complete') {
    setBusy(true);
    setError(null);
    try {
      await transitionInterview(authenticatedRequest, sessionId, action);
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the interview.');
    } finally {
      setBusy(false);
    }
  }

  async function extract() {
    setBusy(true);
    try {
      trackJob(await enqueueExtraction(authenticatedRequest, sessionId));
      setReviewOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not begin memory review.');
    } finally {
      setBusy(false);
    }
  }

  const pending = suggestions.filter((item) => item.status === 'pending');
  const currentQuestion = session?.questions?.at(-1);

  return (
    <WorkspaceShell active="stories">
      <main className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_34%)] px-4 py-5 sm:px-7 lg:px-9">
        <div className="mx-auto max-w-[92rem]">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stroke bg-card/90 px-5 py-4 shadow-sm backdrop-blur">
            <div className="flex items-center gap-4">
              <Link href={`/stories/${storyId}/interviews`} className="grid size-10 place-items-center rounded-xl border border-stroke hover:bg-surface" aria-label="Back to interviews"><ArrowLeft className="size-4" /></Link>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent">VitaNarr AI interview</p>
                <h1 className="mt-1 font-serif text-2xl font-semibold">{session?.focusArea || 'Your life story'}</h1>
              </div>
            </div>
            {session && <LifecycleControls session={session} busy={busy} onAction={changeLifecycle} />}
          </header>

          {error && <div role="alert" className="mt-4 flex items-start justify-between rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-700"><span>{error}</span><button onClick={() => setError(null)} aria-label="Dismiss error"><X className="size-4" /></button></div>}

          {loading ? (
            <div className="mt-5 grid min-h-[34rem] place-items-center rounded-2xl border border-stroke bg-card"><LoaderCircle className="size-7 animate-spin text-brand" aria-label="Loading interview" /></div>
          ) : session ? (
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
              <section className="flex min-h-[42rem] flex-col overflow-hidden rounded-[1.6rem] border border-stroke bg-card shadow-sm" aria-label="Interview conversation">
                <div className="border-b border-stroke bg-brand/[0.045] px-5 py-3 text-center text-xs font-bold text-muted">
                  <span className="inline-flex items-center gap-2"><Sparkles className="size-3.5 text-accent" /> Your answers are saved exactly as you write them</span>
                </div>
                <div className="flex-1 space-y-7 overflow-y-auto px-5 py-7 sm:px-8">
                  {session.questions?.map((question) => (
                    <div key={question.id} className="space-y-4">
                      <div className="flex max-w-3xl items-start gap-3">
                        <span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground"><Sparkles className="size-4" /></span>
                        <div className="rounded-2xl rounded-tl-md bg-brand/[0.07] px-5 py-4">
                          <p className="mb-2 text-[0.67rem] font-extrabold uppercase tracking-[0.16em] text-brand">VitaNarr assistant · {CATEGORY_LABELS[question.category]}</p>
                          <p className="font-serif text-[1.35rem] font-semibold leading-8">{question.prompt}</p>
                        </div>
                      </div>
                      {question.answer && (
                        <div className="ml-auto max-w-2xl rounded-2xl rounded-tr-md border border-accent/25 bg-[#c5a36a]/10 px-5 py-4">
                          <p className="mb-2 text-[0.67rem] font-extrabold uppercase tracking-[0.16em] text-accent">Your original answer</p>
                          <p className="whitespace-pre-wrap leading-7">{question.answer.skipped ? <em className="text-muted">Question skipped</em> : question.answer.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {job && !terminalJobStates.has(job.status) && <ThinkingCard job={job} />}
                  <div ref={conversationEnd} />
                </div>

                <div className="border-t border-stroke bg-surface/55 p-4 sm:p-6">
                  {session.status === 'active' && currentQuestion && !currentQuestion.answer ? (
                    <form onSubmit={(event) => { event.preventDefault(); void submitAnswer(); }}>
                      <label htmlFor="interview-answer" className="sr-only">Write your answer</label>
                      <textarea id="interview-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={busy} maxLength={20000} rows={4} className="w-full resize-none rounded-2xl border border-stroke bg-card px-4 py-3 leading-7 outline-none focus:border-brand focus:ring-4 focus:ring-brand/10" placeholder="Write your answer here…" />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <button type="button" disabled={busy} onClick={() => void submitAnswer(true)} className="button-quiet text-muted">Skip this question</button>
                        <button disabled={busy || answer.trim().length < 2} className="button-primary">{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} Send answer</button>
                      </div>
                    </form>
                  ) : job?.status === 'failed' ? (
                    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-red-700">{job.errorMessage || 'AI processing could not finish.'}</p>{job.retryable && <button className="button-primary" onClick={() => void retryAiJob(authenticatedRequest, job.id).then(trackJob)}><RotateCcw className="size-4" /> Try again</button>}</div>
                  ) : session.status === 'paused' ? (
                    <p className="text-center text-sm font-semibold text-muted">This interview is paused. Resume when you are ready.</p>
                  ) : session.status === 'completed' ? (
                    <p className="text-center text-sm font-semibold text-muted">Interview complete. Your original conversation remains available here.</p>
                  ) : (
                    <p className="text-center text-sm font-semibold text-muted">Preparing your next question…</p>
                  )}
                </div>
              </section>

              <aside className="space-y-5">
                <TopicPanel topics={progress} disabled={busy} onChange={async (topic, status) => { await updateTopic(authenticatedRequest, sessionId, topic, status); await reload(); }} />
                <section className="rounded-2xl border border-stroke bg-card p-5">
                  <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent">Memory review</p><h2 className="mt-1 font-serif text-2xl font-semibold">Potential memories</h2></div>{pending.length > 0 && <span className="grid size-7 place-items-center rounded-full bg-accent text-xs font-extrabold text-white">{pending.length}</span>}</div>
                  <p className="mt-3 text-sm leading-6 text-muted">AI suggestions stay separate from your Memory Vault until you approve them.</p>
                  <button onClick={() => { setReviewOpen(true); if (!suggestions.length) void extract(); }} disabled={busy || !session.questions?.some((q) => q.answer && !q.answer.skipped)} className="button-primary mt-5 w-full"><Sparkles className="size-4" /> {suggestions.length ? 'Review suggestions' : 'Find memories'}</button>
                </section>
              </aside>
            </div>
          ) : null}
        </div>
      </main>

      {reviewOpen && session && (
        <MemoryReview
          job={job?.type === 'memory_extraction' ? job : null}
          suggestions={suggestions}
          onClose={() => setReviewOpen(false)}
          onRetry={async () => {
            if (job) trackJob(await retryAiJob(authenticatedRequest, job.id));
          }}
          onSave={async (candidate, createTimelineEvent) => {
            await updateExtraction(authenticatedRequest, candidate.id, {
              title: candidate.title,
              description: candidate.description,
              category: candidate.category,
            });
            await approveExtraction(authenticatedRequest, candidate.id, { createTimelineEvent });
            await reload();
          }}
          onReject={async (candidate) => { await rejectExtraction(authenticatedRequest, candidate.id); await reload(); }}
        />
      )}
    </WorkspaceShell>
  );
}

function LifecycleControls({ session, busy, onAction }: { session: InterviewSession; busy: boolean; onAction: (action: 'pause' | 'resume' | 'complete') => Promise<void> }) {
  if (session.status === 'completed') return <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold text-brand"><CheckCircle2 className="size-4" /> Completed</span>;
  return <div className="flex items-center gap-2">{session.status === 'active' ? <button disabled={busy} onClick={() => void onAction('pause')} className="button-quiet"><Pause className="size-4" /> Pause</button> : <button disabled={busy} onClick={() => void onAction('resume')} className="button-quiet"><Play className="size-4" /> Resume</button>}<button disabled={busy} onClick={() => void onAction('complete')} className="button-quiet"><Square className="size-3.5" /> Complete</button></div>;
}

function ThinkingCard({ job }: { job: AiJob }) {
  const labels = { queued: 'Waiting for the AI worker', processing: 'Considering what to ask next', retrying: 'Trying again safely', completed: 'Complete', failed: 'Failed', cancelled: 'Cancelled' };
  return <div role="status" className="flex max-w-xl items-center gap-3 rounded-2xl border border-accent/25 bg-accent/8 px-5 py-4"><LoaderCircle className="size-5 animate-spin text-accent" /><div><p className="text-sm font-bold">{labels[job.status]}</p><p className="mt-0.5 text-xs text-muted">Attempt {Math.max(job.attempts, 1)} of {job.maxAttempts}</p></div></div>;
}

function TopicPanel({ topics, disabled, onChange }: { topics: TopicCoverage[]; disabled: boolean; onChange: (category: string, status: 'exploring' | 'skipped') => Promise<void> }) {
  const byCategory = new Map(topics.map((topic) => [topic.category, topic]));
  return <section className="rounded-2xl border border-stroke bg-card p-5"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent">Life topic progress</p><h2 className="mt-1 font-serif text-2xl font-semibold">The shape of your story</h2><div className="mt-5 space-y-2">{MEMORY_CATEGORIES.slice(0, 9).map((category) => { const topic = byCategory.get(category); const status = topic?.status ?? 'unexplored'; return <div key={category} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface"><TopicIcon status={status} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{CATEGORY_LABELS[category]}</p><p className="text-xs capitalize text-muted">{status}</p></div><button disabled={disabled} onClick={() => void onChange(category, status === 'skipped' ? 'exploring' : 'skipped')} className="text-xs font-bold text-muted hover:text-brand">{status === 'skipped' ? 'Reopen' : 'Skip'}</button></div>; })}</div></section>;
}

function TopicIcon({ status }: { status: string }) {
  if (status === 'covered') return <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />;
  if (status === 'exploring') return <Clock3 className="size-5 shrink-0 text-accent" />;
  if (status === 'skipped') return <Circle className="size-5 shrink-0 text-muted/50" />;
  return <Circle className="size-5 shrink-0 text-stroke" />;
}

function MemoryReview({ job, suggestions, onClose, onRetry, onSave, onReject }: { job: AiJob | null; suggestions: ExtractionCandidate[]; onClose: () => void; onRetry: () => Promise<void>; onSave: (candidate: ExtractionCandidate, timeline: boolean) => Promise<void>; onReject: (candidate: ExtractionCandidate) => Promise<void> }) {
  const pending = suggestions.filter((item) => item.status === 'pending');
  return <div className="fixed inset-0 z-[80] overflow-y-auto bg-evergreen/65 p-3 backdrop-blur-sm sm:p-6"><div className="mx-auto my-3 min-h-[calc(100vh-1.5rem)] max-w-5xl rounded-[2rem] bg-surface shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between rounded-t-[2rem] border-b border-stroke bg-surface/95 px-6 py-5 backdrop-blur sm:px-9"><div><p className="eyebrow-text">Review before saving</p><h2 className="mt-1 font-serif text-3xl font-semibold">Memory suggestions</h2></div><button onClick={onClose} className="grid size-10 place-items-center rounded-xl border border-stroke" aria-label="Close memory review"><X className="size-5" /></button></header><div className="p-5 sm:p-9">{job && !terminalJobStates.has(job.status) ? <div className="grid min-h-72 place-items-center text-center"><div><LoaderCircle className="mx-auto size-8 animate-spin text-accent" /><h3 className="mt-5 font-serif text-3xl font-semibold">Looking for source-backed memories…</h3><p className="mt-2 text-sm text-muted">Your original answers remain private and unchanged.</p></div></div> : job?.status === 'failed' ? <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-6 text-center"><p className="font-bold text-red-700">{job.errorMessage}</p>{job.retryable && <button onClick={() => void onRetry()} className="button-primary mt-4"><RotateCcw className="size-4" /> Try extraction again</button>}</div> : pending.length ? <div className="space-y-5">{pending.map((candidate) => <SuggestionCard key={candidate.id} initial={candidate} onSave={onSave} onReject={onReject} />)}</div> : <div className="grid min-h-72 place-items-center text-center"><div><CheckCircle2 className="mx-auto size-9 text-brand" /><h3 className="mt-4 font-serif text-3xl font-semibold">Nothing waiting for review</h3><p className="mt-2 text-sm text-muted">Approved memories are now in your Memory Vault.</p></div></div>}</div></div></div>;
}

function SuggestionCard({ initial, onSave, onReject }: { initial: ExtractionCandidate; onSave: (candidate: ExtractionCandidate, timeline: boolean) => Promise<void>; onReject: (candidate: ExtractionCandidate) => Promise<void> }) {
  const [candidate, setCandidate] = useState(initial);
  const [timeline, setTimeline] = useState(false);
  const [saving, setSaving] = useState(false);
  return <article className="rounded-2xl border border-stroke bg-card p-5 sm:p-7"><div className="rounded-xl border-l-4 border-accent bg-accent/8 px-4 py-3"><p className="text-[0.67rem] font-extrabold uppercase tracking-[0.16em] text-accent">Evidence from your answer</p><blockquote className="mt-2 font-serif text-lg italic leading-7">“{candidate.evidenceQuote}”</blockquote></div><div className="mt-5 grid gap-4"><label><span className="mb-2 block text-sm font-bold">Memory title</span><input className="form-input" maxLength={180} value={candidate.title} onChange={(event) => setCandidate({ ...candidate, title: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Description</span><textarea className="form-input min-h-28 py-3" maxLength={20000} value={candidate.description} onChange={(event) => setCandidate({ ...candidate, description: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Category</span><select className="form-input" value={candidate.category} onChange={(event) => setCandidate({ ...candidate, category: event.target.value as MemoryCategory })}>{MEMORY_CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label><label className="flex items-center gap-3 rounded-xl border border-stroke p-4 text-sm font-semibold"><input type="checkbox" checked={timeline} onChange={(event) => setTimeline(event.target.checked)} /> Also add this memory to my Life Timeline</label></div><div className="mt-5 flex flex-wrap justify-end gap-3"><button disabled={saving} onClick={() => { setSaving(true); void onReject(candidate).finally(() => setSaving(false)); }} className="button-quiet text-red-700"><X className="size-4" /> Reject</button><button disabled={saving || !candidate.title.trim() || !candidate.description.trim()} onClick={() => { setSaving(true); void onSave(candidate, timeline).finally(() => setSaving(false)); }} className="button-primary">{saving ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />} Approve memory</button></div></article>;
}

function jobStorageKey(sessionId: string) {
  return `vitanarr:interview:${sessionId}:active-job`;
}
