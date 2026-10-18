import Link from 'next/link';
import { Archive, ArrowRight, Pencil, RotateCcw, Trash2 } from 'lucide-react';

import { cn } from '@/lib/cn';

import { getCoverClass, STORY_STATUS_LABELS, type Story } from './story-types';

export function StoryCard({ story, onArchive, onRestore, onDelete }: { story: Story; onArchive: (story: Story) => void; onRestore: (story: Story) => void; onDelete: (story: Story) => void }) {
  const isLight = story.coverKey === 'linen';
  return (
    <article className="group overflow-hidden rounded-[1.6rem] border border-stroke bg-card shadow-[0_16px_40px_rgba(23,61,56,0.06)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(23,61,56,0.11)]">
      <div className={cn('relative aspect-[16/10] overflow-hidden bg-gradient-to-br p-5', getCoverClass(story.coverKey), isLight ? 'text-[#25302d]' : 'text-white')}>
        <div className="absolute inset-y-0 left-0 w-2 bg-black/15" />
        <div className="flex h-full flex-col justify-between border border-current/25 p-4">
          <span className="text-[0.58rem] font-bold tracking-[0.2em] opacity-65">MY AUTOBIOGRAPHY</span>
          <div><h2 className="max-w-xs font-serif text-3xl font-semibold leading-[0.9] tracking-[-0.04em]">{story.title}</h2>{story.subtitle && <p className="mt-3 max-w-sm text-xs leading-5 opacity-70">{story.subtitle}</p>}</div>
        </div>
        <span className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/20 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-white backdrop-blur-sm">{STORY_STATUS_LABELS[story.status]}</span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted">Updated {formatDate(story.updatedAt)} · {story.writingLanguage}</p>
          <div className="flex items-center gap-1">
            <Link href={`/stories/${story.id}/edit`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground" aria-label={`Edit ${story.title}`}><Pencil className="size-4" /></Link>
            {story.status === 'archived' ? (
              <button type="button" onClick={() => onRestore(story)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground" aria-label={`Restore ${story.title}`}><RotateCcw className="size-4" /></button>
            ) : (
              <button type="button" onClick={() => onArchive(story)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground" aria-label={`Archive ${story.title}`}><Archive className="size-4" /></button>
            )}
            <button type="button" onClick={() => onDelete(story)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-red-500/10 hover:text-red-600" aria-label={`Delete ${story.title}`}><Trash2 className="size-4" /></button>
          </div>
        </div>
        <Link href={`/stories/${story.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand">Open story <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" /></Link>
      </div>
    </article>
  );
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
