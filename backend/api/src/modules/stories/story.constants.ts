export const STORY_STATUSES = [
  'draft',
  'in_progress',
  'completed',
  'archived',
] as const;

export type StoryStatus = (typeof STORY_STATUSES)[number];

export const STORY_COVER_KEYS = [
  'heritage',
  'evergreen',
  'sunrise',
  'linen',
] as const;

export type StoryCoverKey = (typeof STORY_COVER_KEYS)[number];

const ALLOWED_STATUS_TRANSITIONS: Record<StoryStatus, StoryStatus[]> = {
  draft: ['draft', 'in_progress', 'archived'],
  in_progress: ['draft', 'in_progress', 'completed', 'archived'],
  completed: ['in_progress', 'completed', 'archived'],
  archived: ['draft', 'archived'],
};

export function canTransitionStoryStatus(
  current: StoryStatus,
  next: StoryStatus,
): boolean {
  return ALLOWED_STATUS_TRANSITIONS[current].includes(next);
}
