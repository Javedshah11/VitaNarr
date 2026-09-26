import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { DATABASE_CLIENT } from '../../infrastructure/database/database.constants.js';
import type { DatabaseClient } from '../../infrastructure/database/database.js';
import { authSessions } from '../../infrastructure/database/schema.js';
import { TokenService } from './security/token.service.js';

export interface IssuedRefreshSession {
  sessionId: string;
  token: string;
  expiresAt: Date;
}

export interface RotatedRefreshSession extends IssuedRefreshSession {
  userId: string;
}

@Injectable()
export class AuthSessionsService {
  constructor(
    @Inject(DATABASE_CLIENT)
    private readonly databaseClient: DatabaseClient,
    private readonly tokenService: TokenService,
  ) {}

  async create(userId: string): Promise<IssuedRefreshSession> {
    const refreshToken = this.tokenService.createRefreshToken();

    const [session] = await this.databaseClient.database
      .insert(authSessions)
      .values({
        userId,
        refreshTokenHash: refreshToken.hash,
        expiresAt: refreshToken.expiresAt,
      })
      .returning({
        id: authSessions.id,
      });

    if (!session) {
      throw new Error('Failed to create authentication session.');
    }

    return {
      sessionId: session.id,
      token: refreshToken.token,
      expiresAt: refreshToken.expiresAt,
    };
  }

  async rotate(currentToken: string): Promise<RotatedRefreshSession | null> {
    const currentHash = this.tokenService.hashRefreshToken(currentToken);

    const now = new Date();

    const [currentSession] = await this.databaseClient.database
      .select({
        id: authSessions.id,
        userId: authSessions.userId,
      })
      .from(authSessions)
      .where(
        and(
          eq(authSessions.refreshTokenHash, currentHash),
          isNull(authSessions.revokedAt),
          gt(authSessions.expiresAt, now),
        ),
      )
      .limit(1);

    if (!currentSession) {
      return null;
    }

    const replacementToken = this.tokenService.createRefreshToken();

    return this.databaseClient.database.transaction(async (transaction) => {
      const [revokedSession] = await transaction
        .update(authSessions)
        .set({
          revokedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(authSessions.id, currentSession.id),
            eq(authSessions.refreshTokenHash, currentHash),
            isNull(authSessions.revokedAt),
            gt(authSessions.expiresAt, now),
          ),
        )
        .returning({
          id: authSessions.id,
        });

      if (!revokedSession) {
        return null;
      }

      const [newSession] = await transaction
        .insert(authSessions)
        .values({
          userId: currentSession.userId,
          refreshTokenHash: replacementToken.hash,
          expiresAt: replacementToken.expiresAt,
        })
        .returning({
          id: authSessions.id,
        });

      if (!newSession) {
        throw new Error('Failed to rotate authentication session.');
      }

      return {
        sessionId: newSession.id,
        userId: currentSession.userId,
        token: replacementToken.token,
        expiresAt: replacementToken.expiresAt,
      };
    });
  }

  async revoke(token: string): Promise<boolean> {
    const tokenHash = this.tokenService.hashRefreshToken(token);

    const now = new Date();

    const [session] = await this.databaseClient.database
      .update(authSessions)
      .set({
        revokedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(authSessions.refreshTokenHash, tokenHash),
          isNull(authSessions.revokedAt),
        ),
      )
      .returning({
        id: authSessions.id,
      });

    return Boolean(session);
  }
}
