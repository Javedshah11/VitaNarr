import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { CookieOptions, Request, Response } from 'express';

import type { SafeUser } from '../users/user.types.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from './auth.constants.js';
import { AuthService, type AuthResult } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

type CookieRequest = Omit<Request, 'cookies'> & {
  cookies: Record<string, string | undefined>;
};

export interface AuthenticationResponse {
  accessToken: string;
  user: SafeUser;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

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
  async register(@Body() input: RegisterDto): Promise<SafeUser> {
    return this.authService.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in to VitaNarr',
  })
  @ApiOkResponse({
    description: 'Authentication successful.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password.',
  })
  async login(
    @Body() input: LoginDto,
    @Res({ passthrough: true })
    response: Response,
  ): Promise<AuthenticationResponse> {
    const result = await this.authService.login(input);

    this.setRefreshCookie(response, result);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh session',
  })
  @ApiOkResponse({
    description: 'Access token and refresh session renewed.',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh session is invalid or expired.',
  })
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true })
    response: Response,
  ): Promise<AuthenticationResponse> {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh session is required.');
    }

    const result = await this.authService.refresh(refreshToken);

    this.setRefreshCookie(response, result);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Sign out of VitaNarr',
  })
  @ApiNoContentResponse({
    description: 'Session revoked.',
  })
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true })
    response: Response,
  ): Promise<void> {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    response.clearCookie(REFRESH_COOKIE_NAME, this.getRefreshCookieOptions());
  }

  private setRefreshCookie(response: Response, result: AuthResult): void {
    response.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
      ...this.getRefreshCookieOptions(),
      expires: result.refreshTokenExpiresAt,
    });
  }

  private getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,

      secure: this.configService.get<string>('NODE_ENV') === 'production',

      sameSite: 'lax',

      path: REFRESH_COOKIE_PATH,
    };
  }
}
