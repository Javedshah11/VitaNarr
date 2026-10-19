import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AuthenticatedUser } from '../auth/authenticated-user.decorator.js';
import type { SafeUser } from '../users/user.types.js';
import {
  CreateTimelineEventDto,
  ListTimelineEventsDto,
  TimelineMemoryLinkDto,
  UpdateTimelineEventDto,
} from './dto/timeline.dto.js';
import { TimelineService } from './timeline.service.js';
@UseGuards(AccessTokenGuard)
@Controller()
export class TimelineController {
  constructor(private readonly service: TimelineService) {}
  @Post('stories/:storyId/timeline-events') create(
    @AuthenticatedUser() user: SafeUser,
    @Param('storyId', new ParseUUIDPipe()) storyId: string,
    @Body() input: CreateTimelineEventDto,
  ) {
    return this.service.create(user.id, storyId, input);
  }
  @Get('stories/:storyId/timeline-events') list(
    @AuthenticatedUser() user: SafeUser,
    @Param('storyId', new ParseUUIDPipe()) storyId: string,
    @Query() query: ListTimelineEventsDto,
  ) {
    return this.service.list(user.id, storyId, query);
  }
  @Get('timeline-events/:id') get(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.get(user.id, id);
  }
  @Patch('timeline-events/:id') update(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateTimelineEventDto,
  ) {
    return this.service.update(user.id, id, input);
  }
  @Post('timeline-events/:id/memories') link(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: TimelineMemoryLinkDto,
  ) {
    return this.service.link(user.id, id, input.memoryId);
  }
  @Delete('timeline-events/:id/memories/:memoryId') unlink(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('memoryId', new ParseUUIDPipe()) memoryId: string,
  ) {
    return this.service.unlink(user.id, id, memoryId);
  }
  @Delete('timeline-events/:id') @HttpCode(HttpStatus.NO_CONTENT) async delete(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.service.delete(user.id, id);
  }
}
