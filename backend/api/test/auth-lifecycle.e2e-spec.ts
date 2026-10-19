import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { DATABASE_CLIENT } from '../src/infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../src/infrastructure/database/database.js';
import { users } from '../src/infrastructure/database/schema.js';

describe('Authentication lifecycle', () => {
  let app: INestApplication;
  let databaseClient: DatabaseClient;

  const testEmail = `auth-lifecycle-${Date.now()}@example.com`;
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

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: testEmail,
        displayName: 'Auth Lifecycle User',
        password,
      })
      .expect(201);
  });

  afterAll(async () => {
    await databaseClient.database
      .delete(users)
      .where(eq(users.email, testEmail));
    await app.close();
    await databaseClient.pool.end();
  });

  it('rejects invalid credentials without revealing which field failed', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'DefinitelyWrong123!',
      })
      .expect(401);

    expect(response.body.message).toMatchObject({
      message: 'Invalid email or password.',
      statusCode: 401,
    });
  });

  it('logs in, authorizes a protected request and rotates the refresh token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testEmail.toUpperCase(), password })
      .expect(200);

    expect(loginResponse.body.accessToken).toEqual(expect.any(String));
    expect(loginResponse.body.user).toMatchObject({ email: testEmail });
    expect(loginResponse.body.user).not.toHaveProperty('passwordHash');

    const loginCookie = getRefreshCookie(loginResponse.headers['set-cookie']);

    expect(loginCookie).toContain('HttpOnly');
    expect(loginCookie).toContain('SameSite=Lax');
    expect(loginCookie).toContain('Path=/api/auth');

    await request(app.getHttpServer()).get('/api/auth/me').expect(401);

    const meResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(meResponse.body).toMatchObject({ email: testEmail });

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', getCookiePair(loginCookie))
      .expect(200);

    const rotatedCookie = getRefreshCookie(
      refreshResponse.headers['set-cookie'],
    );

    expect(rotatedCookie).not.toBe(loginCookie);
    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', getCookiePair(loginCookie))
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', getCookiePair(rotatedCookie))
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .set('Cookie', getCookiePair(rotatedCookie))
      .expect(401);
  });
});

function getRefreshCookie(
  setCookieHeader: string | string[] | undefined,
): string {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];

  const cookie = cookies.find((value) => value.startsWith('vitanarr_refresh='));

  if (!cookie) {
    throw new Error('Expected a refresh cookie in the response.');
  }

  return cookie;
}

function getCookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(';', 1)[0] ?? setCookieHeader;
}
