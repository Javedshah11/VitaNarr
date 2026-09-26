import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { AuthSessionsService } from './auth-sessions.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthSecurityModule } from './security/auth-security.module.js';

@Module({
  imports: [UsersModule, AuthSecurityModule],

  controllers: [AuthController],

  providers: [AuthService, AuthSessionsService],

  exports: [AuthService],
})
export class AuthModule {}
