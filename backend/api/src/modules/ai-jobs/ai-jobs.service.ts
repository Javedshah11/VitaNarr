import { createHash } from 'node:crypto';

import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Queue } from 'bullmq';

import type { Environment } from '../../config/environment.js';
import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import {
  aiJobs,
  interviewAnswers,
  interviewSessions,
  type AiJob,
} from '../../infrastructure/database/schema.js';
import { AI_JOB_OPTIONS, AI_QUEUE, type AiJobPayload } from './ai-jobs.constants.js';

type AiOperation = 'question_generation' | 'memory_extraction';

@Injectable()
export class AiJobsService implements OnApplicationBootstrap, OnApplicationShutdown {
  private reconciliationTimer?: NodeJS.Timeout;

  constructor(
    @Inject(DATABASE_CLIENT) private readonly client: DatabaseClient,
    @InjectQueue(AI_QUEUE) private readonly queue: Queue<AiJobPayload>,
    @Inject(ConfigService)
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async onApplicationBootstrap() {
    await this.reconcile().catch(() => undefined);
    this.reconciliationTimer = setInterval(
      () => void this.reconcile().catch(() => undefined),
      30_000,
    );
    this.reconciliationTimer.unref();
  }

  onApplicationShutdown() {
    if (this.reconciliationTimer) clearInterval(this.reconciliationTimer);
  }

  async enqueue(ownerId: string, sessionId: string, type: AiOperation) {
    const session = await this.findSession(ownerId, sessionId);
    const answers = await this.client.database
      .select({ id: interviewAnswers.id })
      .from(interviewAnswers)
      .where(
        and(
          eq(interviewAnswers.ownerId, ownerId),
          eq(interviewAnswers.sessionId, sessionId),
        ),
      )
      .orderBy(asc(interviewAnswers.createdAt));

    if (!answers.length) {
      throw new BadRequestException('Record an interview answer before requesting AI processing.');
    }
    if (type === 'question_generation' && session.status !== 'active') {
      throw new BadRequestException('Questions can only be generated for an active interview.');
    }

    const keyMaterial =
      type === 'question_generation'
        ? answers.at(-1)!.id
        : answers.map((answer) => answer.id).join('\0');
    const deduplicationKey = createHash('sha256')
      .update(`${sessionId}\0${keyMaterial}`)
      .digest('hex');
    const maxAttempts = this.config.get('AI_JOB_MAX_ATTEMPTS', { infer: true });

    const [inserted] = await this.client.database
      .insert(aiJobs)
      .values({
        ownerId,
        storyId: session.storyId,
        sessionId,
        type,
        deduplicationKey,
        maxAttempts,
      })
      .onConflictDoNothing({
        target: [aiJobs.ownerId, aiJobs.type, aiJobs.deduplicationKey],
      })
      .returning();

    const record = inserted ?? (await this.findByKey(ownerId, type, deduplicationKey));
    if (!record) throw new Error('Failed to create AI job record.');
    if (inserted) await this.publish(record);
    return this.get(ownerId, record.id);
  }

  async get(ownerId: string, jobId: string): Promise<AiJob> {
    const [job] = await this.client.database
      .select()
      .from(aiJobs)
      .where(and(eq(aiJobs.id, jobId), eq(aiJobs.ownerId, ownerId)))
      .limit(1);
    if (!job) throw new NotFoundException('AI job not found.');
    return job;
  }

  async retry(ownerId: string, jobId: string) {
    const record = await this.get(ownerId, jobId);
    if (record.status !== 'failed') {
      throw new ConflictException('Only failed AI jobs can be retried.');
    }
    if (!record.retryable) {
      throw new ConflictException('This failure is not retryable.');
    }

    const queued = await this.queue.getJob(jobId);
    if (queued) await queued.remove();
    const [updated] = await this.client.database
      .update(aiJobs)
      .set({
        status: 'queued',
        attempts: 0,
        progress: 0,
        errorCode: null,
        errorMessage: null,
        enqueuedAt: null,
        startedAt: null,
        failedAt: null,
        cancellationRequested: false,
        updatedAt: new Date(),
      })
      .where(and(eq(aiJobs.id, jobId), eq(aiJobs.ownerId, ownerId)))
      .returning();
    await this.publish(updated!);
    return this.get(ownerId, jobId);
  }

  async cancel(ownerId: string, jobId: string) {
    const record = await this.get(ownerId, jobId);
    if (['completed', 'failed', 'cancelled'].includes(record.status)) {
      throw new ConflictException('This AI job can no longer be cancelled.');
    }
    const queued = await this.queue.getJob(jobId);
    if (queued && (await queued.isActive())) {
      await this.client.database
        .update(aiJobs)
        .set({ cancellationRequested: true, updatedAt: new Date() })
        .where(eq(aiJobs.id, jobId));
      throw new ConflictException('The job is already processing and cannot be interrupted safely.');
    }
    if (queued) await queued.remove();
    const [cancelled] = await this.client.database
      .update(aiJobs)
      .set({
        status: 'cancelled',
        retryable: false,
        cancellationRequested: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiJobs.id, jobId),
          eq(aiJobs.ownerId, ownerId),
          inArray(aiJobs.status, ['queued', 'retrying']),
        ),
      )
      .returning();
    if (!cancelled) throw new ConflictException('The AI job could not be cancelled.');
    return cancelled;
  }

  private async publish(record: AiJob) {
    try {
      await this.queue.add(record.type, { jobId: record.id }, {
        ...AI_JOB_OPTIONS,
        attempts: record.maxAttempts,
        jobId: record.id,
      });
      await this.client.database
        .update(aiJobs)
        .set({ enqueuedAt: new Date(), updatedAt: new Date() })
        .where(eq(aiJobs.id, record.id));
      return true;
    } catch {
      // PostgreSQL is authoritative. Reconciliation will publish this durable
      // queued record after Redis becomes available again.
      return false;
    }
  }

  private async reconcile() {
    const recoverable = await this.client.database
      .select()
      .from(aiJobs)
      .where(inArray(aiJobs.status, ['queued', 'retrying', 'processing']))
      .limit(100);
    for (const record of recoverable) {
      const existing = await this.queue.getJob(record.id);
      if (!existing) await this.publish(record);
    }
  }

  private async findSession(ownerId: string, sessionId: string) {
    const [session] = await this.client.database
      .select()
      .from(interviewSessions)
      .where(
        and(eq(interviewSessions.id, sessionId), eq(interviewSessions.ownerId, ownerId)),
      )
      .limit(1);
    if (!session) throw new NotFoundException('Interview session not found.');
    return session;
  }

  private async findByKey(ownerId: string, type: AiOperation, key: string) {
    const [record] = await this.client.database
      .select()
      .from(aiJobs)
      .where(
        and(
          eq(aiJobs.ownerId, ownerId),
          eq(aiJobs.type, type),
          eq(aiJobs.deduplicationKey, key),
        ),
      )
      .limit(1);
    return record;
  }
}
