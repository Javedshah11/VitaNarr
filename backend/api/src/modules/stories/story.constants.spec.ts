import { describe, expect, it } from 'vitest';

import { canTransitionStoryStatus } from './story.constants.js';

describe('story lifecycle transitions', () => {
  it('allows the supported writing lifecycle', () => {
    expect(canTransitionStoryStatus('draft', 'in_progress')).toBe(true);
    expect(canTransitionStoryStatus('in_progress', 'completed')).toBe(true);
    expect(canTransitionStoryStatus('completed', 'in_progress')).toBe(true);
    expect(canTransitionStoryStatus('draft', 'archived')).toBe(true);
    expect(canTransitionStoryStatus('archived', 'draft')).toBe(true);
  });

  it('rejects transitions that skip required review states', () => {
    expect(canTransitionStoryStatus('draft', 'completed')).toBe(false);
    expect(canTransitionStoryStatus('completed', 'draft')).toBe(false);
    expect(canTransitionStoryStatus('archived', 'in_progress')).toBe(false);
    expect(canTransitionStoryStatus('archived', 'completed')).toBe(false);
  });
});
