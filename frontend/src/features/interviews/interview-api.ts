import type { AuthenticatedRequest } from '@/features/stories/story-api';
import type {
  AiJob,
  ExtractionCandidate,
  InterviewPage,
  InterviewSession,
  TopicCoverage,
  TopicStatus,
} from './interview-types';

export function listInterviews(request: AuthenticatedRequest, storyId: string) {
  return request<InterviewPage>(`/api/stories/${storyId}/interviews`);
}

export function startInterview(
  request: AuthenticatedRequest,
  storyId: string,
  input: { focusArea?: string; language?: string },
) {
  return request<InterviewSession>(`/api/stories/${storyId}/interviews`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getInterview(request: AuthenticatedRequest, sessionId: string) {
  return request<InterviewSession>(`/api/interviews/${sessionId}`);
}

export function recordAnswer(
  request: AuthenticatedRequest,
  sessionId: string,
  input: { questionId: string; content?: string; skipped?: boolean },
) {
  return request<InterviewSession>(`/api/interviews/${sessionId}/answers`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function transitionInterview(
  request: AuthenticatedRequest,
  sessionId: string,
  action: 'pause' | 'resume' | 'complete',
) {
  return request<InterviewSession>(`/api/interviews/${sessionId}/${action}`, { method: 'POST' });
}

export function getProgress(request: AuthenticatedRequest, sessionId: string) {
  return request<TopicCoverage[]>(`/api/interviews/${sessionId}/progress`);
}

export function updateTopic(
  request: AuthenticatedRequest,
  sessionId: string,
  category: string,
  status: TopicStatus,
) {
  return request<TopicCoverage>(`/api/interviews/${sessionId}/topics/${category}`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export function enqueueQuestion(request: AuthenticatedRequest, sessionId: string) {
  return request<AiJob>(`/api/interviews/${sessionId}/questions/next/async`, { method: 'POST' });
}

export function enqueueExtraction(request: AuthenticatedRequest, sessionId: string) {
  return request<AiJob>(`/api/interviews/${sessionId}/extractions/async`, { method: 'POST' });
}

export function getAiJob(request: AuthenticatedRequest, jobId: string) {
  return request<AiJob>(`/api/ai-jobs/${jobId}`);
}

export function retryAiJob(request: AuthenticatedRequest, jobId: string) {
  return request<AiJob>(`/api/ai-jobs/${jobId}/retry`, { method: 'POST' });
}

export function listExtractions(request: AuthenticatedRequest, sessionId: string) {
  return request<ExtractionCandidate[]>(`/api/interviews/${sessionId}/extractions`);
}

export function updateExtraction(
  request: AuthenticatedRequest,
  id: string,
  input: Partial<Pick<ExtractionCandidate, 'title' | 'description' | 'category' | 'eventDate' | 'datePrecision' | 'location'>>,
) {
  return request<ExtractionCandidate>(`/api/extractions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function approveExtraction(
  request: AuthenticatedRequest,
  id: string,
  input: { createTimelineEvent: boolean },
) {
  return request<ExtractionCandidate>(`/api/extractions/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function rejectExtraction(request: AuthenticatedRequest, id: string) {
  return request<ExtractionCandidate>(`/api/extractions/${id}/reject`, { method: 'POST' });
}
