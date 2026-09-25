import { Injectable } from '@nestjs/common';

import type { SafeUser } from '../users/user.types.js';
import { UsersService } from '../users/users.service.js';
import type { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(input: RegisterDto): Promise<SafeUser> {
    return this.usersService.create({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });
  }
}