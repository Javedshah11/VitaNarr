import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import type { SafeUser } from '../users/user.types.js';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Create a new VitaNarr account',
  })
  @ApiCreatedResponse({
    description: 'Account created successfully.',
  })
  @ApiConflictResponse({
    description: 'An account with this email already exists.',
  })
  async register(
    @Body() input: RegisterDto,
  ): Promise<SafeUser> {
    return this.authService.register(input);
  }
}