'use client';
import type React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import {
  CATEGORY_LABELS,
  DATE_PRECISIONS,
  MEMORY_CATEGORIES,
  type Memory,
  type MemoryInput,
} from './memory-types';
const schema = z
  .object({
    title: z.string().trim().min(1, 'Give this memory a title.').max(180),
    description: z.string().trim().min(1, 'Describe what happened.').max(20000),
    category: z.enum(MEMORY_CATEGORIES),
    datePrecision: z.enum(DATE_PRECISIONS),
    eventDate: z.string().optional(),
    location: z.string().max(255).optional(),
    emotionalSignificance: z.number().int().min(1).max(5),
    tags: z.string().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.datePrecision !== 'unknown' && !value.eventDate)
      context.addIssue({
        code: 'custom',
        path: ['eventDate'],
        message: 'Add the best available date.',
      });
    if (value.datePrecision === 'unknown' && value.eventDate)
      context.addIssue({
        code: 'custom',
        path: ['eventDate'],
        message: 'Remove the date or choose another precision.',
      });
  });
type Values = z.infer<typeof schema>;
export function MemoryForm({
  memory,
  onSubmit,
  error,
  submitLabel,
}: {
  memory?: Memory;
  onSubmit: (input: MemoryInput) => Promise<void>;
  error?: string | null;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: memory?.title ?? '',
      description: memory?.description ?? '',
      category: memory?.category ?? 'other',
      datePrecision: memory?.datePrecision ?? 'unknown',
      eventDate: memory?.eventDate ?? '',
      location: memory?.location ?? '',
      emotionalSignificance: memory?.emotionalSignificance ?? 3,
      tags: memory?.tags.join(', ') ?? '',
    },
  });
  const precision = useWatch({ control, name: 'datePrecision' });
  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(async (values) =>
        onSubmit({
          ...values,
          eventDate: values.eventDate || undefined,
          tags: values.tags
            ?.split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      )}
      noValidate
    >
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Memory title" error={errors.title?.message} wide>
          <input
            className="form-input"
            {...register('title')}
            placeholder="The day I started school"
          />
        </Field>
        <Field label="Category">
          <select className="form-input" {...register('category')}>
            {MEMORY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date precision">
          <select className="form-input" {...register('datePrecision')}>
            <option value="unknown">Date unknown</option>
            <option value="approximate">Approximate date</option>
            <option value="year">Year known</option>
            <option value="month">Month known</option>
            <option value="exact">Exact date</option>
          </select>
        </Field>
        <Field label="Event date" error={errors.eventDate?.message}>
          <input
            type="date"
            className="form-input"
            disabled={precision === 'unknown'}
            {...register('eventDate')}
          />
        </Field>
        <Field label="Location">
          <input className="form-input" {...register('location')} placeholder="Lahore, Pakistan" />
        </Field>
        <Field label="Emotional significance">
              <select className="form-input" {...register('emotionalSignificance', { valueAsNumber: true })}>
            <option value="1">1 — Small detail</option>
            <option value="2">2 — Worth remembering</option>
            <option value="3">3 — Meaningful</option>
            <option value="4">4 — Very important</option>
            <option value="5">5 — Life defining</option>
          </select>
        </Field>
        <Field label="Your memory" error={errors.description?.message} wide>
          <textarea
            className="form-input min-h-64 resize-y py-3 leading-7"
            {...register('description')}
            placeholder="Write what you remember in your own words…"
          />
        </Field>
        <Field label="Tags" wide>
          <input
            className="form-input"
            {...register('tags')}
            placeholder="school, first day, teacher"
          />
          <span className="mt-1 block text-xs text-muted">Separate tags with commas.</span>
        </Field>
      </div>
      <div className="flex justify-end">
        <button className="button-primary button-large" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
function Field({
  label,
  error,
  wide = false,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={wide ? 'sm:col-span-2' : ''}>
      <span className="mb-2 block text-sm font-bold">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}
