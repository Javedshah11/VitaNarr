import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { inArray } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { DATABASE_CLIENT } from '../src/infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../src/infrastructure/database/database.js';
import { users } from '../src/infrastructure/database/schema.js';
import {
  INTELLIGENCE_CLIENT,
  type IntelligenceClient,
} from '../src/modules/interviews/intelligence.client.js';

describe('Interview session management', () => {
  let app: INestApplication;
  let client: DatabaseClient;
  let ownerToken: string;
  let otherToken: string;
  let storyId: string;
  let sessionId: string;
  let questionId: string;
  let secondQuestionId: string;

  const stamp = Date.now();
  const ownerEmail = `interview-owner-${stamp}@example.com`;
  const otherEmail = `interview-other-${stamp}@example.com`;
  const password = 'StrongPassword123!';
  const intelligenceClient: IntelligenceClient = {
    generateQuestion: async () => ({
      question: 'What about that experience still stands out to you today?',
      category: 'childhood',
      strategy: 'follow_up',
      target_topic: 'childhood',
    }),
    extractMemories: async ({ answers }) => ({
      candidates: [
        {
          source_answer_id: answers[0]!.id,
          title: 'A Rainy-Day Memory',
          description: answers[0]!.content,
          category: 'childhood',
          event_date: null,
          date_precision: 'unknown',
          location: null,
          evidence_quote: answers[0]!.content,
        },
        {
          source_answer_id: answers[0]!.id,
          title: 'Remembering Home',
          description: 'A meaningful memory connected to home.',
          category: 'family',
          event_date: null,
          date_precision: 'unknown',
          location: null,
          evidence_quote: answers[0]!.content,
        },
      ],
    }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(INTELLIGENCE_CLIENT)
      .useValue(intelligenceClient)
      .compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    client = app.get(DATABASE_CLIENT);
    await register(ownerEmail, 'Interview Owner');
    await register(otherEmail, 'Other Interviewer');
    ownerToken = await login(ownerEmail);
    otherToken = await login(otherEmail);
    const story = await request(app.getHttpServer())
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Interview Story' })
      .expect(201);
    storyId = story.body.id as string;
  });

  afterAll(async () => {
    const rows = await client.database
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.email, [ownerEmail, otherEmail]));
    if (rows.length) {
      await client.database.delete(users).where(
        inArray(
          users.id,
          rows.map((row) => row.id),
        ),
      );
    }
    await app.close();
    await client.pool.end();
  });

  it('requires authentication and owned story access', async () => {
    await request(app.getHttpServer())
      .post(`/api/stories/${storyId}/interviews`)
      .send({})
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/stories/${storyId}/interviews`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({})
      .expect(404);
  });

  it('starts an interview with a persisted bootstrap question', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/stories/${storyId}/interviews`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ focusArea: 'Childhood', language: 'English' })
      .expect(201);

    sessionId = response.body.id as string;
    questionId = response.body.questions[0].id as string;
    expect(response.body).toMatchObject({
      status: 'active',
      focusArea: 'Childhood',
      language: 'English',
    });
    expect(response.body.questions).toHaveLength(1);
    expect(response.body.questions[0]).toMatchObject({
      sequence: 1,
      source: 'bootstrap',
      answer: null,
    });
  });

  it('conceals sessions and lists from another account', async () => {
    await request(app.getHttpServer())
      .get(`/api/interviews/${sessionId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/stories/${storyId}/interviews`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('preserves one immutable original answer', async () => {
    const content = 'I remember the scent of rain outside our first home.';
    const recorded = await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/answers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ questionId, content })
      .expect(201);
    expect(recorded.body.questions[0].answer).toMatchObject({
      content,
      skipped: false,
    });

    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/answers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ questionId, content: 'A replacement answer' })
      .expect(409);
  });

  it('generates and persists a validated AI follow-up', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/questions/next`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);

    expect(response.body.questions).toHaveLength(2);
    expect(response.body.questions[1]).toMatchObject({
      sequence: 2,
      source: 'ai',
      prompt: 'What about that experience still stands out to you today?',
      answer: null,
    });
    secondQuestionId = response.body.questions[1].id as string;

    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/questions/next`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('tracks progress and honors an explicit topic boundary', async () => {
    await request(app.getHttpServer())
      .get(`/api/interviews/${sessionId}/progress`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    const boundary = await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/topics/challenge`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'skipped' })
      .expect(200);
    expect(boundary.body).toMatchObject({
      category: 'challenge',
      status: 'skipped',
      userBoundary: true,
    });

    const progress = await request(app.getHttpServer())
      .get(`/api/interviews/${sessionId}/progress`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(progress.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'childhood',
          questionsAsked: 2,
          answersReceived: 1,
        }),
        expect.objectContaining({
          category: 'challenge',
          status: 'skipped',
        }),
      ]),
    );

    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/topics/not-a-topic`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'skipped' })
      .expect(400);
  });

  it('persists only one question during simultaneous generation requests', async () => {
    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/answers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        questionId: secondQuestionId,
        content: 'It reminds me how small details can remain meaningful.',
      })
      .expect(201);

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/interviews/${sessionId}/questions/next`)
        .set('Authorization', `Bearer ${ownerToken}`),
      request(app.getHttpServer())
        .post(`/api/interviews/${sessionId}/questions/next`)
        .set('Authorization', `Bearer ${ownerToken}`),
    ]);
    expect(
      responses.map((response) => response.status).sort((left, right) => left - right),
    ).toEqual([201, 400]);

    const conversation = await request(app.getHttpServer())
      .get(`/api/interviews/${sessionId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(conversation.body.questions).toHaveLength(3);
  });

  it('extracts pending suggestions and requires owned access', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/extractions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({ status: 'pending' });

    const duplicateRequest = await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/extractions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    expect(duplicateRequest.body).toHaveLength(2);

    await request(app.getHttpServer())
      .get(`/api/interviews/${sessionId}/extractions`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('edits, transactionally approves once, and rejects another suggestion', async () => {
    const listed = await request(app.getHttpServer())
      .get(`/api/interviews/${sessionId}/extractions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const [first, second] = listed.body as Array<{ id: string }>;

    await request(app.getHttpServer())
      .patch(`/api/extractions/${first!.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'My Edited Rainy-Day Memory' })
      .expect(200);

    const approvals = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/extractions/${first!.id}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ createTimelineEvent: true }),
      request(app.getHttpServer())
        .post(`/api/extractions/${first!.id}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ createTimelineEvent: true }),
    ]);
    expect(approvals.map((response) => response.status)).toEqual([200, 200]);
    expect(approvals[0]!.body.approvedMemoryId).toBe(
      approvals[1]!.body.approvedMemoryId,
    );
    expect(approvals[0]!.body.approvedTimelineEventId).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/extractions/${second!.id}/reject`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('rejected'));

    await request(app.getHttpServer())
      .post(`/api/extractions/${second!.id}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({})
      .expect(409);
  });

  it('pauses, resumes, and completes with enforced transitions', async () => {
    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/pause`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('paused'));

    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/answers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ questionId, skipped: true })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/resume`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('active'));

    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.status).toBe('completed'));

    await request(app.getHttpServer())
      .post(`/api/interviews/${sessionId}/resume`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('lists persisted interview progress for resume discovery', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/stories/${storyId}/interviews`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).toMatchObject({
      id: sessionId,
      status: 'completed',
    });
  });

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
