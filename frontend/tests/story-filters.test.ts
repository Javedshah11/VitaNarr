import { describe, expect, it } from 'vitest';

import { filterAndSortStories } from '@/features/stories/story-filters';
import type { Story } from '@/features/stories/story-types';

const stories: Story[] = [
  {
    id: 'story-2',
    ownerId: 'owner-1',
    title: 'School Days',
    subtitle: 'Lessons beyond the classroom',
    description: null,
    coverKey: 'sunrise',
    writingLanguage: 'English',
    status: 'in_progress',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'story-1',
    ownerId: 'owner-1',
    title: 'A Family Journey',
    subtitle: null,
    description: 'Stories of home and belonging',
    coverKey: 'heritage',
    writingLanguage: 'Urdu',
    status: 'draft',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-02T00:00:00.000Z',
  },
];

describe('filterAndSortStories', () => {
  it('searches titles, subtitles, and descriptions without mutating the input', () => {
    const originalOrder = stories.map((story) => story.id);

    expect(filterAndSortStories(stories, 'classroom', 'all', 'updated_desc')).toHaveLength(1);
    expect(filterAndSortStories(stories, 'belonging', 'all', 'updated_desc')[0]?.id).toBe(
      'story-1',
    );
    expect(stories.map((story) => story.id)).toEqual(originalOrder);
  });

  it('combines status filtering with the selected ordering', () => {
    expect(
      filterAndSortStories(stories, '', 'draft', 'title_asc').map((story) => story.id),
    ).toEqual(['story-1']);
    expect(
      filterAndSortStories(stories, '', 'all', 'created_desc').map((story) => story.id),
    ).toEqual(['story-1', 'story-2']);
    expect(filterAndSortStories(stories, '', 'all', 'title_asc').map((story) => story.id)).toEqual([
      'story-1',
      'story-2',
    ]);
  });
});
