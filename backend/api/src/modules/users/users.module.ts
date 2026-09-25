import { Module } from '@nestjs/common';

import { AuthSecurityModule } from '../auth/security/auth-security.module.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthSecurityModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
