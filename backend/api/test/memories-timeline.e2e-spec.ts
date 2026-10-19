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

describe('Memory vault and timeline', () => {
  let app: INestApplication;
  let client: DatabaseClient;
  let ownerToken: string;
  let otherToken: string;
  let storyId: string;
  let memoryId: string;
  let eventId: string;
  const stamp = Date.now();
  const ownerEmail = `memory-owner-${stamp}@example.com`;
  const otherEmail = `memory-other-${stamp}@example.com`;
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
    client = app.get(DATABASE_CLIENT);
    await register(ownerEmail, 'Memory Owner');
    await register(otherEmail, 'Other Owner');
    ownerToken = await login(ownerEmail);
    otherToken = await login(otherEmail);
    const story = await request(app.getHttpServer())
      .post('/api/stories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'My Source Story' })
      .expect(201);
    storyId = story.body.id as string;
  });
  afterAll(async () => {
    const rows = await client.database
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.email, [ownerEmail, otherEmail]));
    if (rows.length)
      await client.database.delete(users).where(
        inArray(
          users.id,
          rows.map((row) => row.id),
        ),
      );
    await app.close();
    await client.pool.end();
  });
  it('requires authentication and validates date uncertainty', async () => {
    await request(app.getHttpServer())
      .post(`/api/stories/${storyId}/memories`)
      .send({ title: 'Private', description: 'Hidden' })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/stories/${storyId}/memories`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Uncertain',
        description: 'An uncertain date',
        datePrecision: 'year',
      })
      .expect(400);
  });
  it('creates, searches and updates a tagged memory', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/stories/${storyId}/memories`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'First day at school',
        description: 'I carried a green bag.',
        category: 'education',
        eventDate: '2004-09-01',
        datePrecision: 'approximate',
        tags: ['School', 'first day'],
        emotionalSignificance: 4,
      })
      .expect(201);
    memoryId = created.body.id as string;
    expect(created.body.tags).toEqual(['school', 'first day']);
    const list = await request(app.getHttpServer())
      .get(`/api/stories/${storyId}/memories?search=school&category=education`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(list.body.total).toBe(1);
    const updated = await request(app.getHttpServer())
      .patch(`/api/memories/${memoryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ location: 'Lahore', tags: ['education'] })
      .expect(200);
    expect(updated.body.location).toBe('Lahore');
  });
  it('conceals memories and story-scoped lists from another user', async () => {
    await request(app.getHttpServer())
      .get(`/api/memories/${memoryId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/stories/${storyId}/memories`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/api/memories/${memoryId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Stolen' })
      .expect(404);
  });
  it('creates a timeline event linked to an owned memory', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/stories/${storyId}/timeline-events`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Started school',
        eventDate: '2004-01-01',
        datePrecision: 'year',
        category: 'education',
        lifeStage: 'School Life',
        memoryIds: [memoryId],
      })
      .expect(201);
    eventId = created.body.id as string;
    expect(created.body.memoryIds).toEqual([memoryId]);
    const timeline = await request(app.getHttpServer())
      .get(`/api/stories/${storyId}/timeline-events`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(timeline.body.items[0].id).toBe(eventId);
  });
  it('rejects cross-story links and invalid media content', async () => {
    await request(app.getHttpServer())
      .post(`/api/timeline-events/${eventId}/memories`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ memoryId })
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/memories/${memoryId}/media`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('not really an image'), {
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
  });

  it('stores, authorizes, downloads, and deletes private media', async () => {
    const image = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const uploaded = await request(app.getHttpServer())
      .post(`/api/memories/${memoryId}/media`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', image, { filename: 'memory.png', contentType: 'image/png' })
      .expect(201);
    const assetId = uploaded.body.id as string;
    await request(app.getHttpServer())
      .get(`/api/media/${assetId}/content`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    const download = await request(app.getHttpServer())
      .get(`/api/media/${assetId}/content`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect('Content-Type', /image\/png/)
      .expect(200);
    expect(download.body).toEqual(image);
    await request(app.getHttpServer())
      .delete(`/api/media/${assetId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
  });
  it('deletes timeline events and memories without affecting the story', async () => {
    await request(app.getHttpServer())
      .delete(`/api/timeline-events/${eventId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/memories/${memoryId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/stories/${storyId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });
  async function register(email: string, displayName: string) {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, displayName, password })
      .expect(201);
  }
  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return response.body.accessToken as string;
  }
});
