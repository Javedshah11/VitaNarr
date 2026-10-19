import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { inArray } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { DATABASE_CLIENT } from '../src/infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../src/infrastructure/database/database.js';
import { stories, users } from '../src/infrastructure/database/schema.js';

describe('Story management', () => {
  let app: INestApplication;
  let databaseClient: DatabaseClient;
  let ownerToken: string;
  let otherToken: string;
  let storyId: string;

  const timestamp = Date.now();
  const ownerEmail = `stories-owner-${timestamp}@example.com`;
  const otherEmail = `stories-other-${timestamp}@example.com`;
  const password = 'StrongPassword123!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    databaseClient = app.get<DatabaseClient>(DATABASE_CLIENT);

    await register(ownerEmail, 'Story Owner');
    await register(otherEmail, 'Other Storyteller');
    ownerToken = await login(ownerEmail);
    otherToken = await login(otherEmail);
  });

  afterAll(async () => {
    const testUsers = await databaseClient.database
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.email, [ownerEmail, otherEmail]));

    if (testUsers.length > 0) {
      const userIds = testUsers.map((user) => user.id);
      await databaseClient.database
        .delete(stories)
        .where(inArray(stories.ownerId, userIds));
      await databaseClient.database
        .delete(users)
        .where(inArray(users.id, userIds));
    }

    await app.close();
    await databaseClient.pool.end();
  });

  it('rejects unauthenticated story creation', async () => {
    await request(app.getHttpServer())
      .post('/api/stories')
      .send({ title: 'Unowned Story' })
      .expect(401);
  });

  it('creates and lists only the authenticated owner stories', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: '  The Story of My Life  ',
        subtitle: 'A personal journey',
        description: 'Childhood, education and meaningful turning points.',
        coverKey: 'heritage',
        writingLanguage: 'English',
      })
      .expect(201);

    storyId = createResponse.body.id as string;

    expect(createResponse.body).toMatchObject({
      title: 'The Story of My Life',
      subtitle: 'A personal journey',
      status: 'draft',
      coverKey: 'heritage',
    });

    const ownerList = await request(app.getHttpServer())
      .get('/api/stories?search=personal&sort=title&order=asc')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(ownerList.body).toHaveLength(1);
    expect(ownerList.body[0].id).toBe(storyId);

    const otherList = await request(app.getHttpServer())
      .get('/api/stories')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);

    expect(otherList.body).toEqual([]);
  });

  it('does not disclose or mutate another user story', async () => {
    await request(app.getHttpServer())
      .get(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Stolen title' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ confirmationTitle: 'The Story of My Life' })
      .expect(404);
  });

  it('updates fields and enforces lifecycle transitions', async () => {
    const started = await request(app.getHttpServer())
      .patch(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'in_progress', subtitle: 'An evolving personal journey' })
      .expect(200);

    expect(started.body).toMatchObject({
      status: 'in_progress',
      subtitle: 'An evolving personal journey',
    });

    await request(app.getHttpServer())
      .patch(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'completed' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'draft' })
      .expect(400);
  });

  it('archives and restores an autobiography', async () => {
    const archived = await request(app.getHttpServer())
      .post(`/api/stories/${storyId}/archive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(archived.body.status).toBe('archived');

    const restored = await request(app.getHttpServer())
      .post(`/api/stories/${storyId}/restore`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    expect(restored.body.status).toBe('draft');
  });

  it('requires exact-title confirmation before permanent deletion', async () => {
    await request(app.getHttpServer())
      .delete(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ confirmationTitle: 'wrong title' })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ confirmationTitle: 'The Story of My Life' })
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });

  async function register(email: string, displayName: string): Promise<void> {
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
