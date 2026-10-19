'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Download,
  File,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react';
import { WorkspaceShell } from '@/components/workspace-shell';
import { useAuth } from '@/features/auth/auth-context';
import {
  deleteMedia,
  deleteMemory,
  getMemory,
  listMedia,
  uploadMedia,
} from '@/features/memories/memory-api';
import { CATEGORY_LABELS, type MediaAsset, type Memory } from '@/features/memories/memory-types';
import { formatMemoryDate } from '../page';
import { API_URL } from '@/lib/api';
export default function MemoryDetailPage() {
  const { id: storyId, memoryId } = useParams<{ id: string; memoryId: string }>();
  const router = useRouter();
  const { authenticatedRequest, accessToken } = useAuth();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    let active = true;
    void Promise.all([
      getMemory(authenticatedRequest, memoryId),
      listMedia(authenticatedRequest, memoryId),
    ])
      .then(([item, files]) => {
        if (active) {
          setMemory(item);
          setAssets(files);
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Could not load this memory.');
      });
    return () => {
      active = false;
    };
  }, [authenticatedRequest, memoryId]);
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const asset = await uploadMedia(authenticatedRequest, memoryId, file);
      setAssets((current) => [...current, asset]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }
  async function download(asset: MediaAsset) {
    try {
      const response = await fetch(`${API_URL}/api/media/${asset.id}/content`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Could not open this private file.');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = asset.originalName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Download failed.');
    }
  }
  if (!memory)
    return (
      <WorkspaceShell active="stories">
        <main className="grid min-h-[70vh] place-items-center">
          {error ? (
            <p className="text-red-700">{error}</p>
          ) : (
            <LoaderCircle className="animate-spin text-brand" />
          )}
        </main>
      </WorkspaceShell>
    );
  return (
    <WorkspaceShell active="stories">
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
        <Link
          href={`/stories/${storyId}/memories`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted"
        >
          <ArrowLeft className="size-4" /> Memory vault
        </Link>
        {error && <p className="mt-5 rounded-xl bg-red-500/10 p-4 text-sm text-red-700">{error}</p>}
        <article className="mt-8 rounded-[2rem] border border-stroke bg-card p-6 sm:p-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row">
            <div>
              <span className="rounded-full bg-brand/8 px-3 py-1 text-xs font-bold text-brand">
                {CATEGORY_LABELS[memory.category]}
              </span>
              <h1 className="mt-5 font-serif text-5xl font-semibold tracking-[-0.045em]">
                {memory.title}
              </h1>
              <p className="mt-3 text-sm text-muted">
                {formatMemoryDate(memory)}
                {memory.location && (
                  <>
                    {' '}
                    · <MapPin className="inline size-3.5" /> {memory.location}
                  </>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/stories/${storyId}/memories/${memory.id}/edit`}
                className="button-quiet"
              >
                <Pencil className="size-4" /> Edit
              </Link>
              <button
                className="button-quiet text-red-600"
                onClick={async () => {
                  if (window.confirm(`Delete “${memory.title}” permanently?`)) {
                    await deleteMemory(authenticatedRequest, memory.id);
                    router.replace(`/stories/${storyId}/memories`);
                  }
                }}
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </div>
          </div>
          <div className="mt-9 whitespace-pre-wrap text-lg leading-8">{memory.description}</div>
          <div className="mt-8 flex flex-wrap gap-2">
            {memory.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        </article>
        <section className="mt-8 rounded-[2rem] border border-stroke bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-semibold">Private photographs & documents</h2>
              <p className="mt-1 text-sm text-muted">JPG, PNG, WebP, PDF or DOCX · maximum 10 MB</p>
            </div>
            <label className="button-primary cursor-pointer">
              <Upload className="size-4" />
              {uploading ? 'Uploading…' : 'Upload file'}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,.docx"
                disabled={uploading}
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-3 rounded-xl border border-stroke p-4"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-brand/8 text-brand">
                  {asset.kind === 'image' ? (
                    <ImageIcon className="size-4" />
                  ) : (
                    <File className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{asset.originalName}</p>
                  <p className="text-xs text-muted">
                    {(asset.sizeBytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => void download(asset)}
                  aria-label={`Download ${asset.originalName}`}
                >
                  <Download className="size-4" />
                </button>
                <button
                  onClick={async () => {
                    await deleteMedia(authenticatedRequest, asset.id);
                    setAssets((items) => items.filter((item) => item.id !== asset.id));
                  }}
                  aria-label={`Delete ${asset.originalName}`}
                  className="text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {!assets.length && (
              <p className="text-sm text-muted">No supporting files attached yet.</p>
            )}
          </div>
        </section>
      </main>
    </WorkspaceShell>
  );
}
