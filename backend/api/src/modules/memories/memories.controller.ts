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
  CreateMemoryDto,
  ListMemoriesDto,
  UpdateMemoryDto,
} from './dto/memory.dto.js';
import { MemoriesService } from './memories.service.js';

@UseGuards(AccessTokenGuard)
@Controller()
export class MemoriesController {
  constructor(private readonly service: MemoriesService) {}
  @Post('stories/:storyId/memories') create(
    @AuthenticatedUser() user: SafeUser,
    @Param('storyId', new ParseUUIDPipe()) storyId: string,
    @Body() input: CreateMemoryDto,
  ) {
    return this.service.create(user.id, storyId, input);
  }
  @Get('stories/:storyId/memories') list(
    @AuthenticatedUser() user: SafeUser,
    @Param('storyId', new ParseUUIDPipe()) storyId: string,
    @Query() query: ListMemoriesDto,
  ) {
    return this.service.list(user.id, storyId, query);
  }
  @Get('memories/:memoryId') get(
    @AuthenticatedUser() user: SafeUser,
    @Param('memoryId', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.get(user.id, id);
  }
  @Patch('memories/:memoryId') update(
    @AuthenticatedUser() user: SafeUser,
    @Param('memoryId', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateMemoryDto,
  ) {
    return this.service.update(user.id, id, input);
  }
  @Delete('memories/:memoryId') @HttpCode(HttpStatus.NO_CONTENT) async delete(
    @AuthenticatedUser() user: SafeUser,
    @Param('memoryId', new ParseUUIDPipe()) id: string,
  ) {
    await this.service.delete(user.id, id);
  }
}
