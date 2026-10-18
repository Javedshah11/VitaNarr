import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { Request } from 'express';

import type { SafeUser } from '../users/user.types.js';

export type AuthenticatedRequest = Request & {
  user: SafeUser;
};

export const AuthenticatedUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SafeUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
  },
);
