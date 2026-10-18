'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, LoaderCircle, X } from 'lucide-react';

import type { Story } from './story-types';

export function DeleteStoryDialog({ story, onClose, onConfirm }: { story: Story | null; onClose: () => void; onConfirm: (story: Story, confirmationTitle: string) => Promise<void> }) {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!story) return;
    const timeout = window.setTimeout(() => { setConfirmation(''); setError(null); }, 0);
    return () => window.clearTimeout(timeout);
  }, [story]);

  if (!story) return null;

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(story, confirmation);
      onClose();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Could not delete this story.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-evergreen/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="delete-story-title" className="w-full max-w-lg rounded-[2rem] border border-stroke bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-red-500/10 text-red-600"><AlertTriangle className="size-5" /></span>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface" aria-label="Close delete confirmation"><X className="size-4" /></button>
        </div>
        <h2 id="delete-story-title" className="mt-6 font-serif text-4xl font-semibold tracking-[-0.04em]">Delete this autobiography?</h2>
        <p className="mt-4 text-sm leading-7 text-muted">This permanently removes <strong className="text-foreground">{story.title}</strong>. Future chapters and memories connected to it would also be removed. This action cannot be undone.</p>
        <label className="mt-6 block"><span className="mb-2 block text-sm font-bold">Type the exact title to confirm</span><input className="form-input" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={story.title} autoFocus /></label>
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="button-quiet">Cancel</button><button type="button" onClick={confirm} disabled={confirmation.trim() !== story.title || submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45">{submitting && <LoaderCircle className="size-4 animate-spin" />} Delete permanently</button></div>
      </div>
    </div>
  );
}
