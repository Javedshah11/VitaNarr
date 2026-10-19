import {
  ServiceUnavailableException,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { DATABASE_CLIENT } from '../src/infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../src/infrastructure/database/database.js';
import { aiJobs, users } from '../src/infrastructure/database/schema.js';
import {
  INTELLIGENCE_CLIENT,
  type IntelligenceClient,
} from '../src/modules/interviews/intelligence.client.js';

describe('AI background job processing', () => {
  let app: INestApplication;
  let client: DatabaseClient;
  let ownerToken: string;
  let otherToken: string;
  let sessionId: string;
  let answerContent: string;
  let questionJobId: string;
  let transientFailures = 2;

  const stamp = Date.now();
  const ownerEmail = `jobs-owner-${stamp}@example.com`;
  const otherEmail = `jobs-other-${stamp}@example.com`;
  const password = 'StrongPassword123!';
  const intelligence: IntelligenceClient = {
    generateQuestion: async () => {
      if (transientFailures-- > 0) {
        throw new ServiceUnavailableException('Temporary model failure.');
      }
      return {
        question: 'Which detail from that memory feels most meaningful now?',
        category: 'childhood',
        strategy: 'follow_up',
        target_topic: 'childhood',
      };
    },
    extractMemories: async ({ answers }) => ({
      candidates: [
        {
          source_answer_id: answers[0]!.id,
          title: 'A Source-Backed Memory',
          description: answers[0]!.content,
          category: 'childhood',
          event_date: null,
          date_precision: 'unknown',
          location: null,
          evidence_quote: answers[0]!.content,
        },
      ],
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(INTELLIGENCE_CLIENT)
      .useValue(intelligence)
      .compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    client = app.get(DATABASE_CLIENT);
    await register(ownerEmail, 'Job Owner');
    await register(otherEmail, 'Other Job User');
    ownerToken = await login(ownerEmail);
    otherToken = await login(otherEmail);

    const story = await request(app.getHttpServer())
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Queued Interview Story' })
      .expect(201);
    const session = await request(app.getHttpServer())
      .post(`/api/stories/${story.body.id as string}/interviews`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(201);
    sessionId = session.body.id as string;
    answerContent = 'I remember listening to rain beside the old kitchen window.';
    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/answers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ questionId: session.body.questions[0].id, content: answerContent })
      .expect(201);
  });

  afterAll(async () => {
    const rows = await client.database
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.email, [ownerEmail, otherEmail]));
    if (rows.length) {
      await client.database.delete(users).where(
        inArray(users.id, rows.map((row) => row.id)),
      );
    }
    await app.close();
    await client.pool.end();
  });

  it('deduplicates concurrent requests, retries transient failures, and isolates status', async () => {
    const responses = await Promise.all([
      enqueue('questions/next/async'),
      enqueue('questions/next/async'),
    ]);
    expect(responses.map((response) => response.statusCode)).toEqual([202, 202]);
    const jobId = responses[0].body.id as string;
    questionJobId = jobId;
    expect(responses[1].body.id).toBe(jobId);

    await request(app.getHttpServer())
      .get(`/api/ai-jobs/${jobId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    const completed = await waitFor(jobId, 'completed');
    expect(completed).toMatchObject({
      id: jobId,
      status: 'completed',
      attempts: 3,
      progress: 100,
      retryable: false,
    });
    expect(completed.resultReferenceId).toBeTruthy();
  }, 15_000);

  it('allows an eligible manual retry and stops on a permanent state error', async () => {
    await client.database
      .update(aiJobs)
      .set({ status: 'failed', retryable: true, failedAt: new Date() })
      .where(eq(aiJobs.id, questionJobId));

    await request(app.getHttpServer())
      .post(`/api/ai-jobs/${questionJobId}/retry`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(202);
    const failed = await waitFor(questionJobId, 'failed');
    expect(failed).toMatchObject({
      status: 'failed',
      retryable: false,
      errorCode: 'INVALID_OPERATION',
    });

    await request(app.getHttpServer())
      .post(`/api/ai-jobs/${questionJobId}/retry`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(409);
  }, 10_000);

  it('processes extraction asynchronously without placing answers in queue records', async () => {
    const response = await enqueue('extractions/async');
    const jobId = response.body.id as string;
    const completed = await waitFor(jobId, 'completed');
    expect(completed).toMatchObject({
      type: 'memory_extraction',
      status: 'completed',
      progress: 100,
    });
    expect(JSON.stringify(completed)).not.toContain(answerContent);

    const suggestions = await request(app.getHttpServer())
      .get(`/api/interviews/${sessionId}/extractions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(suggestions.body).toHaveLength(1);
    expect(suggestions.body[0]).toMatchObject({ status: 'pending' });
  }, 10_000);

  it('permits authenticated UI polling for long-running local model jobs', async () => {
    const responses = await Promise.all(
      Array.from({ length: 110 }, () =>
        request(app.getHttpServer())
          .get(`/api/ai-jobs/${questionJobId}`)
          .set('Authorization', `Bearer ${ownerToken}`),
      ),
    );

    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
  });

  async function enqueue(path: string) {
    return request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/${path}`)
      .set('Authorization', `Bearer ${ownerToken}`);
  }

  async function waitFor(jobId: string, status: string) {
    const deadline = Date.now() + 12_000;
    while (Date.now() < deadline) {
      const response = await request(app.getHttpServer())
        .get(`/api/ai-jobs/${jobId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      if (response.body.status === status) return response.body;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`AI job ${jobId} did not reach ${status}.`);
  }

  async function register(email: string, displayName: string) {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, displayName, password })
      .expect(201);
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.accessToken as string;
  }
});
