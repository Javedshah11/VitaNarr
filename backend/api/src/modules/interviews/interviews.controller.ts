import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AuthenticatedUser } from '../auth/authenticated-user.decorator.js';
import type { SafeUser } from '../users/user.types.js';
import {
  INTERVIEW_TOPIC_CATEGORIES,
  ListInterviewsDto,
  RecordInterviewAnswerDto,
  StartInterviewDto,
  UpdateInterviewTopicDto,
} from './dto/interview.dto.js';
import { InterviewsService } from './interviews.service.js';

@UseGuards(AccessTokenGuard)
@Controller()
export class InterviewsController {
  constructor(private readonly service: InterviewsService) {}

  @Post('stories/:storyId/interviews')
  start(
    @AuthenticatedUser() user: SafeUser,
    @Param('storyId', new ParseUUIDPipe()) storyId: string,
    @Body() input: StartInterviewDto,
  ) {
    return this.service.start(user.id, storyId, input);
  }

  @Get('stories/:storyId/interviews')
  list(
    @AuthenticatedUser() user: SafeUser,
    @Param('storyId', new ParseUUIDPipe()) storyId: string,
    @Query() query: ListInterviewsDto,
  ) {
    return this.service.list(user.id, storyId, query);
  }

  @Get('interviews/:sessionId')
  get(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.service.get(user.id, sessionId);
  }

  @Post('interviews/:sessionId/answers')
  recordAnswer(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Body() input: RecordInterviewAnswerDto,
  ) {
    return this.service.recordAnswer(user.id, sessionId, input);
  }

  @Post('interviews/:sessionId/questions/next')
  generateNextQuestion(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.service.generateNextQuestion(user.id, sessionId);
  }

  @Get('interviews/:sessionId/progress')
  progress(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.service.progress(user.id, sessionId);
  }

  @Post('interviews/:sessionId/topics/:category')
  @HttpCode(HttpStatus.OK)
  updateTopic(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Param('category') category: string,
    @Body() input: UpdateInterviewTopicDto,
  ) {
    if (!INTERVIEW_TOPIC_CATEGORIES.includes(category as never)) {
      throw new BadRequestException('Unknown interview topic.');
    }
    return this.service.updateTopic(
      user.id,
      sessionId,
      category as (typeof INTERVIEW_TOPIC_CATEGORIES)[number],
      input,
    );
  }

  @Post('interviews/:sessionId/pause')
  @HttpCode(HttpStatus.OK)
  pause(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.service.pause(user.id, sessionId);
  }

  @Post('interviews/:sessionId/resume')
  @HttpCode(HttpStatus.OK)
  resume(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.service.resume(user.id, sessionId);
  }

  @Post('interviews/:sessionId/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @AuthenticatedUser() user: SafeUser,
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
  ) {
    return this.service.complete(user.id, sessionId);
  }
}
