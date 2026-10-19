import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StoryCard } from '@/features/stories/story-card';
import type { Story } from '@/features/stories/story-types';

const story: Story = {
  id: 'story-1',
  ownerId: 'owner-1',
  title: 'The Story of My Life',
  subtitle: 'A personal journey',
  description: 'Memories worth preserving.',
  coverKey: 'heritage',
  writingLanguage: 'English',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};

afterEach(cleanup);

describe('StoryCard', () => {
  it('renders story metadata and routes to the story workspace', () => {
    render(<StoryCard story={story} onArchive={vi.fn()} onRestore={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByRole('heading', { name: story.title })).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open story/i })).toHaveAttribute(
      'href',
      `/stories/${story.id}`,
    );
    expect(screen.getByRole('link', { name: `Edit ${story.title}` })).toHaveAttribute(
      'href',
      `/stories/${story.id}/edit`,
    );
  });

  it('exposes archive and delete actions for active stories', () => {
    const onArchive = vi.fn();
    const onDelete = vi.fn();
    render(
      <StoryCard story={story} onArchive={onArchive} onRestore={vi.fn()} onDelete={onDelete} />,
    );

    fireEvent.click(screen.getByRole('button', { name: `Archive ${story.title}` }));
    fireEvent.click(screen.getByRole('button', { name: `Delete ${story.title}` }));

    expect(onArchive).toHaveBeenCalledWith(story);
    expect(onDelete).toHaveBeenCalledWith(story);
  });
});
