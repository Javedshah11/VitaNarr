import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import { toSafeUser } from '../users/user.types.js';
import { UsersService } from '../users/users.service.js';
import type { AuthenticatedRequest } from './authenticated-user.decorator.js';
import {
  type AccessTokenPayload,
  TokenService,
} from './security/token.service.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.getBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('A valid access token is required.');
    }

    let payload: AccessTokenPayload;

    try {
      payload = await this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException('A valid access token is required.');
    }

    if (payload.type !== 'access' || !payload.sub || !payload.email) {
      throw new UnauthorizedException('A valid access token is required.');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user || user.status !== 'active' || user.email !== payload.email) {
      throw new UnauthorizedException('A valid access token is required.');
    }

    (request as AuthenticatedRequest).user = toSafeUser(user);

    return true;
  }

  private getBearerToken(request: Request): string | null {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return null;
    }

    const [scheme, token, extra] = authorization.trim().split(/\s+/);

    if (scheme?.toLowerCase() !== 'bearer' || !token || extra) {
      return null;
    }

    return token;
  }
}
