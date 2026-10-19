import type { Story, StoryStatus } from './story-types';

export type StorySort = 'updated_desc' | 'created_desc' | 'title_asc';

export function filterAndSortStories(
  stories: Story[],
  search: string,
  status: StoryStatus | 'all',
  sort: StorySort,
): Story[] {
  const query = search.trim().toLocaleLowerCase();
  return stories
    .filter((story) => status === 'all' || story.status === status)
    .filter(
      (story) =>
        !query ||
        [story.title, story.subtitle, story.description].some((value) =>
          value?.toLocaleLowerCase().includes(query),
        ),
    )
    .toSorted((left, right) => {
      if (sort === 'title_asc') return left.title.localeCompare(right.title);
      const field = sort === 'created_desc' ? 'createdAt' : 'updatedAt';
      return new Date(right[field]).getTime() - new Date(left[field]).getTime();
    });
}
