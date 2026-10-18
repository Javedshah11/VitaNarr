import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthSessionsService } from './auth-sessions.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthSecurityModule } from './security/auth-security.module.js';

@Module({
  imports: [UsersModule, AuthSecurityModule],

  controllers: [AuthController],

  providers: [AccessTokenGuard, AuthService, AuthSessionsService],

  exports: [AccessTokenGuard, AuthService, AuthSecurityModule, UsersModule],
})
export class AuthModule {}
