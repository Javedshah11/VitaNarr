import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { DATABASE_CLIENT } from '../src/infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../src/infrastructure/database/database.js';
import {
  profiles,
  users,
} from '../src/infrastructure/database/schema.js';

describe('Authentication registration', () => {
  let app: INestApplication;
  let databaseClient: DatabaseClient;

  const testEmail = `register-${Date.now()}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

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
  });

  afterAll(async () => {
    const [testUser] = await databaseClient.database
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    if (testUser) {
      await databaseClient.database
        .delete(profiles)
        .where(eq(profiles.userId, testUser.id));

      await databaseClient.database
        .delete(users)
        .where(eq(users.id, testUser.id));
    }

    await app.close();
    await databaseClient.pool.end();
  });

  it('registers a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail.toUpperCase(),
        displayName: 'Test User',
        password: 'StrongPassword123!',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      email: testEmail,
      displayName: 'Test User',
      status: 'active',
      emailVerified: false,
    });

    expect(response.body).not.toHaveProperty('passwordHash');

    const [storedUser] = await databaseClient.database
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    expect(storedUser).toBeDefined();
    expect(storedUser?.passwordHash).not.toBe(
      'StrongPassword123!',
    );
  });

  it('rejects a duplicate email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        displayName: 'Duplicate User',
        password: 'StrongPassword123!',
      })
      .expect(409);
  });

  it('rejects an invalid email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'not-an-email',
        displayName: 'Invalid User',
        password: 'StrongPassword123!',
      })
      .expect(400);
  });

  it('rejects a short password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `short-${Date.now()}@example.com`,
        displayName: 'Weak Password',
        password: '123',
      })
      .expect(400);
  });
});