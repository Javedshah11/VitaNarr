import { Injectable, UnauthorizedException } from '@nestjs/common';

import { toSafeUser, type SafeUser } from '../users/user.types.js';
import { UsersService } from '../users/users.service.js';
import { AuthSessionsService } from './auth-sessions.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { PasswordService } from './security/password.service.js';
import { TokenService } from './security/token.service.js';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: SafeUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly authSessionsService: AuthSessionsService,
  ) {}

  async register(input: RegisterDto): Promise<SafeUser> {
    return this.usersService.create({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(input.email);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordValid = await this.passwordService.verify(
      user.passwordHash,
      input.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const refreshSession = await this.authSessionsService.create(user.id);

    const accessToken = await this.tokenService.createAccessToken({
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken,
      refreshToken: refreshSession.token,
      refreshTokenExpiresAt: refreshSession.expiresAt,
      user: toSafeUser(user),
    };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const rotatedSession = await this.authSessionsService.rotate(refreshToken);

    if (!rotatedSession) {
      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }

    const user = await this.usersService.findById(rotatedSession.userId);

    if (!user || user.status !== 'active') {
      await this.authSessionsService.revoke(rotatedSession.token);

      throw new UnauthorizedException('Refresh session is invalid or expired.');
    }

    const accessToken = await this.tokenService.createAccessToken({
      userId: user.id,
      email: user.email,
    });

    return {
      accessToken,
      refreshToken: rotatedSession.token,
      refreshTokenExpiresAt: rotatedSession.expiresAt,
      user: toSafeUser(user),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.authSessionsService.revoke(refreshToken);
  }
}
