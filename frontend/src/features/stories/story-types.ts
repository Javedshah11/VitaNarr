export const STORY_STATUSES = ['draft', 'in_progress', 'completed', 'archived'] as const;

export type StoryStatus = (typeof STORY_STATUSES)[number];
export type StoryCoverKey = 'heritage' | 'evergreen' | 'sunrise' | 'linen';

export interface Story {
  id: string;
  ownerId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  coverKey: StoryCoverKey | null;
  writingLanguage: string;
  status: StoryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoryInput {
  title: string;
  subtitle?: string;
  description?: string;
  coverKey?: StoryCoverKey;
  writingLanguage?: string;
  status?: StoryStatus;
}

export const STORY_STATUS_LABELS: Record<StoryStatus, string> = {
  draft: 'Draft',
  in_progress: 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};

export const STORY_COVERS: Array<{
  key: StoryCoverKey;
  label: string;
  className: string;
}> = [
  {
    key: 'heritage',
    label: 'Heritage Emerald',
    className: 'from-[#214f48] via-[#173d38] to-[#0c2521]',
  },
  {
    key: 'evergreen',
    label: 'Deep Evergreen',
    className: 'from-[#192e2a] via-[#0f2420] to-[#071412]',
  },
  {
    key: 'sunrise',
    label: 'Golden Sunrise',
    className: 'from-[#d7b276] via-[#ae794c] to-[#684a3a]',
  },
  {
    key: 'linen',
    label: 'Warm Linen',
    className: 'from-[#e7dcc8] via-[#cdbb9e] to-[#9f8768]',
  },
];

export function getCoverClass(coverKey: StoryCoverKey | null): string {
  return (
    STORY_COVERS.find((cover) => cover.key === (coverKey ?? 'heritage'))?.className ??
    STORY_COVERS[0]!.className
  );
}
