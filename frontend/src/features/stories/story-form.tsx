'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Check, LoaderCircle } from 'lucide-react';
import { z } from 'zod';

import { cn } from '@/lib/cn';

import {
  STORY_COVERS,
  STORY_STATUS_LABELS,
  type Story,
  type StoryCoverKey,
  type StoryInput,
  type StoryStatus,
} from './story-types';

const storySchema = z.object({
  title: z.string().trim().min(1, 'Give your autobiography a title.').max(160),
  subtitle: z.string().trim().max(255).optional(),
  description: z.string().trim().max(2_000).optional(),
  coverKey: z.enum(['heritage', 'evergreen', 'sunrise', 'linen']),
  writingLanguage: z.string().trim().min(2).max(64),
  status: z
    .enum(['draft', 'in_progress', 'completed', 'archived'])
    .optional(),
});

type StoryFormValues = z.infer<typeof storySchema>;

const languages = ['English', 'Urdu', 'Punjabi', 'Arabic', 'Hindi', 'Spanish', 'French'];

export function StoryForm({
  story,
  onSubmit,
  error,
  submitLabel,
}: {
  story?: Story;
  onSubmit: (input: StoryInput) => Promise<void>;
  error?: string | null;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StoryFormValues>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      title: story?.title ?? '',
      subtitle: story?.subtitle ?? '',
      description: story?.description ?? '',
      coverKey: story?.coverKey ?? 'heritage',
      writingLanguage: story?.writingLanguage ?? 'English',
      status: story?.status,
    },
  });
  const selectedCover = watch('coverKey');

  async function submit(values: StoryFormValues) {
    await onSubmit({
      ...values,
      subtitle: values.subtitle || '',
      description: values.description || '',
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-8" noValidate>
      {error && (
        <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[2rem] border border-stroke bg-card p-6 sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_18rem]">
          <div className="space-y-5">
            <Field label="Book title" error={errors.title?.message} required>
              <input className="form-input" placeholder="The Story of My Life" {...register('title')} />
            </Field>
            <Field label="Subtitle" error={errors.subtitle?.message}>
              <input className="form-input" placeholder="A journey through family, learning and change" {...register('subtitle')} />
            </Field>
            <Field label="Description" error={errors.description?.message}>
              <textarea className="form-input min-h-36 resize-y py-3 leading-6" placeholder="What do you hope this autobiography will preserve?" {...register('description')} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Writing language" error={errors.writingLanguage?.message}>
                <select className="form-input" {...register('writingLanguage')}>
                  {languages.map((language) => <option key={language}>{language}</option>)}
                </select>
              </Field>
              {story && (
                <Field label="Story status" error={errors.status?.message}>
                  <select className="form-input" {...register('status')}>
                    {getAvailableStatuses(story.status).map((status) => (
                      <option key={status} value={status}>{STORY_STATUS_LABELS[status]}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold">Cover preview</p>
            <BookCover coverKey={selectedCover} title={watch('title') || 'Your Story'} subtitle={watch('subtitle')} />
            <p className="mt-4 text-xs leading-5 text-muted">You can change the cover style at any time. Custom cover uploads will arrive in a later publishing phase.</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-stroke bg-card p-6 sm:p-8">
        <div>
          <p className="text-sm font-bold">Choose a cover style</p>
          <p className="mt-1 text-sm text-muted">A visual identity for this autobiography.</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STORY_COVERS.map((cover) => {
            const selected = selectedCover === cover.key;
            return (
              <button key={cover.key} type="button" onClick={() => setValue('coverKey', cover.key, { shouldDirty: true })} className={cn('rounded-2xl border p-3 text-left transition', selected ? 'border-brand ring-2 ring-brand/10' : 'border-stroke hover:border-accent')} aria-pressed={selected}>
                <span className={cn('relative block h-24 overflow-hidden rounded-xl bg-gradient-to-br', cover.className)}>
                  <span className="absolute inset-2 rounded-lg border border-white/25" />
                  {selected && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-white text-brand"><Check className="size-3.5" /></span>}
                </span>
                <span className="mt-3 block text-sm font-bold">{cover.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button type="submit" disabled={isSubmitting} className="button-primary button-large min-w-44">
          {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, required = false, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-bold">{label}{required && <span className="ml-1 text-accent">*</span>}</span>{children}{error && <span className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span>}</label>;
}

function BookCover({ coverKey, title, subtitle }: { coverKey: StoryCoverKey; title: string; subtitle?: string }) {
  const cover = STORY_COVERS.find((item) => item.key === coverKey) ?? STORY_COVERS[0]!;
  const isLight = coverKey === 'linen';
  return (
    <div className={cn('relative mx-auto mt-4 aspect-[3/4] w-full max-w-60 overflow-hidden rounded-r-xl rounded-l-sm bg-gradient-to-br p-5 shadow-[10px_16px_35px_rgba(16,40,36,0.22)]', cover.className, isLight ? 'text-[#25302d]' : 'text-white')}>
      <div className="absolute inset-y-0 left-0 w-2 bg-black/15" />
      <div className="flex h-full flex-col justify-between border border-current/25 p-4 text-center">
        <span className="text-[0.58rem] font-bold tracking-[0.22em] opacity-70">A VITANARR AUTOBIOGRAPHY</span>
        <div><p className="font-serif text-3xl font-semibold leading-[0.9] tracking-[-0.04em]">{title}</p>{subtitle && <p className="mt-4 text-xs leading-5 opacity-70">{subtitle}</p>}</div>
        <span className="font-serif text-sm italic opacity-70">A life remembered</span>
      </div>
    </div>
  );
}

function getAvailableStatuses(current: StoryStatus): StoryStatus[] {
  if (current === 'draft') return ['draft', 'in_progress', 'archived'];
  if (current === 'in_progress') return ['draft', 'in_progress', 'completed', 'archived'];
  if (current === 'completed') return ['in_progress', 'completed', 'archived'];
  return ['draft', 'archived'];
}
