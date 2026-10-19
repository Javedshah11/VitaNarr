import { describe, expect, it, vi } from 'vitest';

import {
  approveExtraction,
  enqueueExtraction,
  enqueueQuestion,
  getAiJob,
  recordAnswer,
  updateTopic,
} from '../src/features/interviews/interview-api';
import type { AuthenticatedRequest } from '../src/features/stories/story-api';

describe('interview API client', () => {
  it('submits immutable answers and queues the next question separately', async () => {
    const request = vi.fn().mockResolvedValue({}) as unknown as AuthenticatedRequest;

    await recordAnswer(request, 'session-1', {
      questionId: 'question-1',
      content: 'My original answer.',
    });
    await enqueueQuestion(request, 'session-1');

    expect(request).toHaveBeenNthCalledWith(1, '/api/interviews/session-1/answers', {
      method: 'POST',
      body: JSON.stringify({ questionId: 'question-1', content: 'My original answer.' }),
    });
    expect(request).toHaveBeenNthCalledWith(
      2,
      '/api/interviews/session-1/questions/next/async',
      { method: 'POST' },
    );
  });

  it('uses asynchronous extraction and authenticated job-status endpoints', async () => {
    const request = vi.fn().mockResolvedValue({}) as unknown as AuthenticatedRequest;

    await enqueueExtraction(request, 'session-2');
    await getAiJob(request, 'job-1');

    expect(request).toHaveBeenNthCalledWith(1, '/api/interviews/session-2/extractions/async', {
      method: 'POST',
    });
    expect(request).toHaveBeenNthCalledWith(2, '/api/ai-jobs/job-1');
  });

  it('persists explicit topic boundaries and memory approval choices', async () => {
    const request = vi.fn().mockResolvedValue({}) as unknown as AuthenticatedRequest;

    await updateTopic(request, 'session-3', 'family', 'skipped');
    await approveExtraction(request, 'candidate-1', { createTimelineEvent: true });

    expect(request).toHaveBeenNthCalledWith(1, '/api/interviews/session-3/topics/family', {
      method: 'POST',
      body: JSON.stringify({ status: 'skipped' }),
    });
    expect(request).toHaveBeenNthCalledWith(2, '/api/extractions/candidate-1/approve', {
      method: 'POST',
      body: JSON.stringify({ createTimelineEvent: true }),
    });
  });
});
