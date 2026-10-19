'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, CalendarDays, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import {
  createTimelineEvent,
  deleteTimelineEvent,
  listMemories,
  listTimeline,
  updateTimelineEvent,
} from '@/features/memories/memory-api';
import {
  CATEGORY_LABELS,
  MEMORY_CATEGORIES,
  type DatePrecision,
  type Memory,
  type MemoryCategory,
  type TimelineEvent,
  type TimelineInput,
} from '@/features/memories/memory-types';
import { formatMemoryDate } from '../memories/page';
export default function TimelinePage() {
  const { id: storyId } = useParams<{ id: string }>();
  const { authenticatedRequest } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [editing, setEditing] = useState<TimelineEvent | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([
      listTimeline(authenticatedRequest, storyId),
      listMemories(authenticatedRequest, storyId, 'pageSize=100'),
    ])
      .then(([timeline, memoryPage]) => {
        if (active) {
          setEvents(timeline.items);
          setMemories(memoryPage.items);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load timeline.');
      });
    return () => {
      active = false;
    };
  }, [authenticatedRequest, storyId]);
  async function save(input: TimelineInput) {
    try {
      const saved =
        editing === 'new'
          ? await createTimelineEvent(authenticatedRequest, storyId, input)
          : await updateTimelineEvent(authenticatedRequest, editing!.id, input);
      setEvents((items) =>
        [...items.filter((item) => item.id !== saved.id), saved].sort(compareEvents),
      );
      setEditing(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save event.');
    }
  }
  const dated = events.filter((event) => event.eventDate);
  const unknown = events.filter((event) => !event.eventDate);
  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        <Link
          href={`/stories/${storyId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted"
        >
          <ArrowLeft className="size-4" /> Back to story
        </Link>
        <div className="mt-8 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow-text">A chronology of verified moments</p>
            <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
              Life timeline
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted">
              Events appear only at the precision you provide. Unknown dates stay in their own
              section.
            </p>
          </div>
          <button
            className="button-primary button-large self-start"
            onClick={() => setEditing('new')}
          >
            <Plus className="size-4" /> Add life event
          </button>
        </div>
        {error && <p className="mt-6 rounded-xl bg-red-500/10 p-4 text-sm text-red-700">{error}</p>}
        {!events.length ? (
          <section className="mt-8 grid min-h-80 place-items-center rounded-[2rem] border border-dashed border-stroke bg-card text-center">
            <div>
              <CalendarDays className="mx-auto size-8 text-brand" />
              <h2 className="mt-5 font-serif text-4xl font-semibold">
                Your timeline is ready for its first milestone.
              </h2>
              <button onClick={() => setEditing('new')} className="button-primary mt-6">
                <Plus className="size-4" /> Add event
              </button>
            </div>
          </section>
        ) : (
          <>
            <TimelineGroup
              events={dated}
              memories={memories}
              onEdit={setEditing}
              onDelete={async (event) => {
                if (window.confirm(`Delete “${event.title}”?`)) {
                  await deleteTimelineEvent(authenticatedRequest, event.id);
                  setEvents((items) => items.filter((item) => item.id !== event.id));
                }
              }}
            />
            {unknown.length > 0 && (
              <section className="mt-12">
                <h2 className="font-serif text-3xl font-semibold">Date not yet known</h2>
                <TimelineGroup
                  events={unknown}
                  memories={memories}
                  onEdit={setEditing}
                  onDelete={async (event) => {
                    await deleteTimelineEvent(authenticatedRequest, event.id);
                    setEvents((items) => items.filter((item) => item.id !== event.id));
                  }}
                />
              </section>
            )}
          </>
        )}
        {editing && (
          <TimelineDialog
            event={editing === 'new' ? undefined : editing}
            memories={memories}
            onClose={() => setEditing(null)}
            onSave={save}
          />
        )}
      </main>
    </WorkspaceShell>
  );
}
function TimelineGroup({
  events,
  memories,
  onEdit,
  onDelete,
}: {
  events: TimelineEvent[];
  memories: Memory[];
  onEdit: (event: TimelineEvent) => void;
  onDelete: (event: TimelineEvent) => void;
}) {
  return (
    <section className="relative mt-10 space-y-6 before:absolute before:bottom-4 before:left-[1.15rem] before:top-4 before:w-px before:bg-accent/60 sm:before:left-32">
      {events.map((event) => (
        <article
          key={event.id}
          className="relative grid gap-5 pl-14 sm:grid-cols-[7rem_1fr] sm:pl-0"
        >
          <div className="text-sm font-bold text-brand sm:pt-7">{formatEventDate(event)}</div>
          <span className="absolute left-3.5 top-7 size-4 rounded-full border-4 border-surface bg-accent sm:left-[7.55rem]" />
          <div className="rounded-2xl border border-stroke bg-card p-6">
            <div className="flex justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-muted">
                  {event.lifeStage || CATEGORY_LABELS[event.category]}
                </span>
                <h2 className="mt-2 font-serif text-3xl font-semibold">{event.title}</h2>
              </div>
              <div className="flex">
                <button
                  onClick={() => onEdit(event)}
                  className="grid size-9 place-items-center"
                  aria-label={`Edit ${event.title}`}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => onDelete(event)}
                  className="grid size-9 place-items-center text-red-600"
                  aria-label={`Delete ${event.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            {event.description && <p className="mt-3 leading-7 text-muted">{event.description}</p>}
            {event.location && (
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-muted">
                <MapPin className="size-3.5" />
                {event.location}
              </p>
            )}
            {event.memoryIds.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {event.memoryIds.map((id) => {
                  const memory = memories.find((item) => item.id === id);
                  return memory ? (
                    <Link
                      key={id}
                      href={`/stories/${event.storyId}/memories/${id}`}
                      className="rounded-lg bg-brand/8 px-3 py-1.5 text-xs font-bold text-brand"
                    >
                      {memory.title}
                    </Link>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
function TimelineDialog({
  event,
  memories,
  onClose,
  onSave,
}: {
  event?: TimelineEvent;
  memories: Memory[];
  onClose: () => void;
  onSave: (input: TimelineInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [eventDate, setEventDate] = useState(event?.eventDate ?? '');
  const [precision, setPrecision] = useState<DatePrecision>(event?.datePrecision ?? 'unknown');
  const [category, setCategory] = useState<MemoryCategory>(event?.category ?? 'other');
  const [location, setLocation] = useState(event?.location ?? '');
  const [lifeStage, setLifeStage] = useState(event?.lifeStage ?? '');
  const [memoryIds, setMemoryIds] = useState(event?.memoryIds ?? []);
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-evergreen/55 p-4 backdrop-blur-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaving(true);
          void onSave({
            title,
            description,
            eventDate: eventDate || undefined,
            datePrecision: precision,
            category,
            location,
            lifeStage,
            memoryIds,
          }).finally(() => setSaving(false));
        }}
        className="my-6 w-full max-w-2xl rounded-[2rem] bg-card p-6 shadow-2xl sm:p-8"
      >
        <div className="flex justify-between">
          <h2 className="font-serif text-4xl font-semibold">
            {event ? 'Edit life event' : 'Add life event'}
          </h2>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">Title</span>
            <input
              required
              maxLength={180}
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Date precision</span>
            <select
              className="form-input"
              value={precision}
              onChange={(e) => setPrecision(e.target.value as DatePrecision)}
            >
              <option value="unknown">Unknown</option>
              <option value="approximate">Approximate</option>
              <option value="year">Year</option>
              <option value="month">Month</option>
              <option value="exact">Exact</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Date</span>
            <input
              type="date"
              required={precision !== 'unknown'}
              disabled={precision === 'unknown'}
              className="form-input"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Category</span>
            <select
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryCategory)}
            >
              {MEMORY_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm font-bold">Life stage</span>
            <input
              className="form-input"
              value={lifeStage}
              onChange={(e) => setLifeStage(e.target.value)}
              placeholder="School Life"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">Location</span>
            <input
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">Description</span>
            <textarea
              className="form-input min-h-28 py-3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
        </div>
        {memories.length > 0 && (
          <fieldset className="mt-5">
            <legend className="text-sm font-bold">Link existing memories</legend>
            <div className="mt-2 max-h-32 space-y-2 overflow-y-auto rounded-xl border border-stroke p-3">
              {memories.map((memory) => (
                <label key={memory.id} className="flex gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={memoryIds.includes(memory.id)}
                    onChange={(e) =>
                      setMemoryIds((ids) =>
                        e.target.checked
                          ? [...ids, memory.id]
                          : ids.filter((id) => id !== memory.id),
                      )
                    }
                  />
                  {memory.title}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="button-quiet">
            Cancel
          </button>
          <button disabled={saving} className="button-primary">
            {saving ? 'Saving…' : 'Save event'}
          </button>
        </div>
      </form>
    </div>
  );
}
function compareEvents(a: TimelineEvent, b: TimelineEvent) {
  if (!a.eventDate) return 1;
  if (!b.eventDate) return -1;
  return a.eventDate.localeCompare(b.eventDate);
}
function formatEventDate(event: TimelineEvent) {
  return formatMemoryDate(event);
}
