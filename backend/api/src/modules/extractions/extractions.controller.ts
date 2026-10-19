import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AuthenticatedUser } from '../auth/authenticated-user.decorator.js';
import type { SafeUser } from '../users/user.types.js';
import { ApproveExtractionDto, UpdateExtractionDto } from './dto/extraction.dto.js';
import { ExtractionsService } from './extractions.service.js';

@UseGuards(AccessTokenGuard)
@Controller()
export class ExtractionsController {
  constructor(private readonly service: ExtractionsService) {}

  @Post('interviews/:sessionId/extractions')
  request(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.service.request(user.id, sessionId);
  }

  @Get('interviews/:sessionId/extractions')
  list(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.service.list(user.id, sessionId);
  }

  @Patch('extractions/:extractionId')
  update(
    @AuthenticatedUser() user: SafeUser,
    @Param('extractionId', new ParseUUIDPipe()) extractionId: string,
    @Body() input: UpdateExtractionDto,
  ) {
    return this.service.update(user.id, extractionId, input);
  }

  @Post('extractions/:extractionId/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @AuthenticatedUser() user: SafeUser,
    @Param('extractionId', new ParseUUIDPipe()) extractionId: string,
    @Body() input: ApproveExtractionDto,
  ) {
    return this.service.approve(user.id, extractionId, input);
  }

  @Post('extractions/:extractionId/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @AuthenticatedUser() user: SafeUser,
    @Param('extractionId', new ParseUUIDPipe()) extractionId: string,
  ) {
    return this.service.reject(user.id, extractionId);
  }
}
