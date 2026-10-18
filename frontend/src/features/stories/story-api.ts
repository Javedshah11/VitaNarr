import type { Story, StoryInput } from './story-types';

export type AuthenticatedRequest = <T>(
  path: string,
  init?: RequestInit,
) => Promise<T>;

export function listStories(request: AuthenticatedRequest): Promise<Story[]> {
  return request<Story[]>('/api/stories');
}

export function getStory(
  request: AuthenticatedRequest,
  storyId: string,
): Promise<Story> {
  return request<Story>(`/api/stories/${storyId}`);
}

export function createStory(
  request: AuthenticatedRequest,
  input: StoryInput,
): Promise<Story> {
  return request<Story>('/api/stories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateStory(
  request: AuthenticatedRequest,
  storyId: string,
  input: StoryInput,
): Promise<Story> {
  return request<Story>(`/api/stories/${storyId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function archiveStory(
  request: AuthenticatedRequest,
  storyId: string,
): Promise<Story> {
  return request<Story>(`/api/stories/${storyId}/archive`, {
    method: 'POST',
  });
}

export function restoreStory(
  request: AuthenticatedRequest,
  storyId: string,
): Promise<Story> {
  return request<Story>(`/api/stories/${storyId}/restore`, {
    method: 'POST',
  });
}

export function deleteStory(
  request: AuthenticatedRequest,
  storyId: string,
  confirmationTitle: string,
): Promise<void> {
  return request<void>(`/api/stories/${storyId}`, {
    method: 'DELETE',
    body: JSON.stringify({ confirmationTitle }),
  });
}
