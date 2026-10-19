import { Processor, WorkerHost } from '@nestjs/bullmq';
import { HttpException, Inject } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { type Job, UnrecoverableError } from 'bullmq';

import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import { aiJobs } from '../../infrastructure/database/schema.js';
import { ExtractionsService } from '../extractions/extractions.service.js';
import { InterviewsService } from '../interviews/interviews.service.js';
import { AI_QUEUE, type AiJobPayload } from './ai-jobs.constants.js';

@Processor(AI_QUEUE, {
  concurrency: Number(process.env.AI_WORKER_CONCURRENCY ?? 1),
})
export class AiJobsProcessor extends WorkerHost {
  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: DatabaseClient,
    private readonly interviews: InterviewsService,
    private readonly extractions: ExtractionsService,
  ) {
    super();
  }

  async process(job: Job<AiJobPayload>) {
    const [record] = await this.client.database
      .update(aiJobs)
      .set({
        status: 'processing',
        attempts: job.attemptsMade + 1,
        progress: 10,
        startedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiJobs.id, job.data.jobId),
          inArray(aiJobs.status, ['queued', 'retrying', 'processing']),
          eq(aiJobs.cancellationRequested, false),
        ),
      )
      .returning();

    if (!record) return;
    try {
      let resultReferenceId: string | null = null;
      if (record.type === 'question_generation') {
        const conversation = await this.interviews.generateNextQuestion(
          record.ownerId,
          record.sessionId,
        );
        resultReferenceId = conversation.questions.at(-1)?.id ?? null;
      } else {
        await this.extractions.request(record.ownerId, record.sessionId);
      }

      await this.client.database
        .update(aiJobs)
        .set({
          status: 'completed',
          progress: 100,
          resultReferenceId,
          completedAt: new Date(),
          retryable: false,
          updatedAt: new Date(),
        })
        .where(eq(aiJobs.id, record.id));
      return { resultReferenceId };
    } catch (error) {
      const permanent = error instanceof HttpException && error.getStatus() < 500;
      const attempts = job.opts.attempts ?? record.maxAttempts;
      const exhausted = job.attemptsMade + 1 >= attempts;
      await this.client.database
        .update(aiJobs)
        .set({
          status: permanent || exhausted ? 'failed' : 'retrying',
          progress: 0,
          retryable: !permanent,
          errorCode: permanent ? 'INVALID_OPERATION' : 'AI_TEMPORARILY_UNAVAILABLE',
          errorMessage: this.safeMessage(error),
          failedAt: permanent || exhausted ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(aiJobs.id, record.id));
      if (permanent) throw new UnrecoverableError(this.safeMessage(error));
      throw error;
    }
  }

  private safeMessage(error: unknown) {
    const fallback = 'AI processing failed without exposing private interview content.';
    if (!(error instanceof HttpException)) return fallback;
    const response = error.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : typeof response === 'object' && response && 'message' in response
          ? String(response.message)
          : fallback;
    return message.slice(0, 500);
  }
}
