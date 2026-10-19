import type { AuthenticatedRequest } from '../stories/story-api';
import type {
  MediaAsset,
  Memory,
  MemoryInput,
  Page,
  TimelineEvent,
  TimelineInput,
} from './memory-types';
export function listMemories(request: AuthenticatedRequest, storyId: string, query = '') {
  return request<Page<Memory>>(`/api/stories/${storyId}/memories${query ? `?${query}` : ''}`);
}
export function getMemory(request: AuthenticatedRequest, id: string) {
  return request<Memory>(`/api/memories/${id}`);
}
export function createMemory(request: AuthenticatedRequest, storyId: string, input: MemoryInput) {
  return request<Memory>(`/api/stories/${storyId}/memories`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
export function updateMemory(request: AuthenticatedRequest, id: string, input: MemoryInput) {
  return request<Memory>(`/api/memories/${id}`, { method: 'PATCH', body: JSON.stringify(input) });
}
export function deleteMemory(request: AuthenticatedRequest, id: string) {
  return request<void>(`/api/memories/${id}`, { method: 'DELETE' });
}
export function listTimeline(request: AuthenticatedRequest, storyId: string) {
  return request<Page<TimelineEvent>>(`/api/stories/${storyId}/timeline-events`);
}
export function createTimelineEvent(
  request: AuthenticatedRequest,
  storyId: string,
  input: TimelineInput,
) {
  return request<TimelineEvent>(`/api/stories/${storyId}/timeline-events`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
export function updateTimelineEvent(
  request: AuthenticatedRequest,
  id: string,
  input: TimelineInput,
) {
  return request<TimelineEvent>(`/api/timeline-events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
export function deleteTimelineEvent(request: AuthenticatedRequest, id: string) {
  return request<void>(`/api/timeline-events/${id}`, { method: 'DELETE' });
}
export function listMedia(request: AuthenticatedRequest, memoryId: string) {
  return request<MediaAsset[]>(`/api/memories/${memoryId}/media`);
}
export function uploadMedia(request: AuthenticatedRequest, memoryId: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  return request<MediaAsset>(`/api/memories/${memoryId}/media`, { method: 'POST', body });
}
export function deleteMedia(request: AuthenticatedRequest, id: string) {
  return request<void>(`/api/media/${id}`, { method: 'DELETE' });
}
