import type { MemoryCategory } from '@/features/memories/memory-types';

export type InterviewStatus = 'active' | 'paused' | 'completed';
export type TopicStatus = 'unexplored' | 'exploring' | 'covered' | 'skipped';
export type AiJobStatus = 'queued' | 'processing' | 'retrying' | 'completed' | 'failed' | 'cancelled';

export interface InterviewAnswer {
  id: string;
  questionId: string;
  content: string | null;
  skipped: boolean;
  createdAt: string;
}

export interface InterviewQuestion {
  id: string;
  sequence: number;
  prompt: string;
  category: MemoryCategory;
  source: 'bootstrap' | 'ai';
  createdAt: string;
  answer: InterviewAnswer | null;
}

export interface InterviewSession {
  id: string;
  storyId: string;
  ownerId: string;
  status: InterviewStatus;
  focusArea: string | null;
  language: string;
  startedAt: string;
  pausedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  questions?: InterviewQuestion[];
}

export interface InterviewPage {
  items: InterviewSession[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TopicCoverage {
  id: string;
  category: MemoryCategory;
  status: TopicStatus;
  questionsAsked: number;
  answersReceived: number;
  userBoundary: boolean;
  lastAskedAt: string | null;
}

export interface AiJob {
  id: string;
  type: 'question_generation' | 'memory_extraction';
  status: AiJobStatus;
  attempts: number;
  maxAttempts: number;
  progress: number;
  resultReferenceId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean;
  cancellationRequested: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionCandidate {
  id: string;
  sessionId: string;
  storyId: string;
  sourceAnswerId: string;
  title: string;
  description: string;
  category: MemoryCategory;
  eventDate: string | null;
  datePrecision: 'exact' | 'month' | 'year' | 'approximate' | 'unknown';
  location: string | null;
  evidenceQuote: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedMemoryId: string | null;
  approvedTimelineEventId: string | null;
}
