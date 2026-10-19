import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AuthenticatedUser } from '../auth/authenticated-user.decorator.js';
import type { SafeUser } from '../users/user.types.js';
import { AiJobsService } from './ai-jobs.service.js';

@UseGuards(AccessTokenGuard)
@Controller()
export class AiJobsController {
  constructor(private readonly jobs: AiJobsService) {}

  @Post('interviews/:sessionId/questions/next/async')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueQuestion(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.jobs.enqueue(user.id, sessionId, 'question_generation');
  }

  @Post('interviews/:sessionId/extractions/async')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueExtraction(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.jobs.enqueue(user.id, sessionId, 'memory_extraction');
  }

  @Get('ai-jobs/:jobId')
  get(
    @AuthenticatedUser() user: SafeUser,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.jobs.get(user.id, jobId);
  }

  @Post('ai-jobs/:jobId/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  retry(
    @AuthenticatedUser() user: SafeUser,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.jobs.retry(user.id, jobId);
  }

  @Post('ai-jobs/:jobId/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @AuthenticatedUser() user: SafeUser,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.jobs.cancel(user.id, jobId);
  }
}
