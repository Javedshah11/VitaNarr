import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  type: 'access';
}

export interface RefreshTokenResult {
  token: string;
  hash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async createAccessToken(input: {
    userId: string;
    email: string;
  }): Promise<string> {
    const expiresIn =
      this.configService.getOrThrow<number>(
        'JWT_ACCESS_TTL_SECONDS',
      );

    return this.jwtService.signAsync(
      {
        sub: input.userId,
        email: input.email,
        type: 'access',
      } satisfies AccessTokenPayload,
      {
        expiresIn,
      },
    );
  }

  createRefreshToken(): RefreshTokenResult {
    const token = randomBytes(64).toString('base64url');

    const ttlDays =
      this.configService.getOrThrow<number>(
        'REFRESH_TOKEN_TTL_DAYS',
      );

    const expiresAt = new Date(
      Date.now() + ttlDays * 24 * 60 * 60 * 1000,
    );

    return {
      token,
      hash: this.hashRefreshToken(token),
      expiresAt,
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256')
      .update(token, 'utf8')
      .digest('hex');
  }

  async verifyAccessToken(
    token: string,
  ): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(
      token,
    );
  }
}