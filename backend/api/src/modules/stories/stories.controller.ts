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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import type { Story } from '../../infrastructure/database/schema.js';
import { AccessTokenGuard } from '../auth/access-token.guard.js';
import { AuthenticatedUser } from '../auth/authenticated-user.decorator.js';
import type { SafeUser } from '../users/user.types.js';
import { CreateStoryDto } from './dto/create-story.dto.js';
import { DeleteStoryDto } from './dto/delete-story.dto.js';
import { ListStoriesDto } from './dto/list-stories.dto.js';
import { UpdateStoryDto } from './dto/update-story.dto.js';
import { StoriesService } from './stories.service.js';

@ApiTags('Stories')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'A valid access token is required.' })
@UseGuards(AccessTokenGuard)
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an autobiography' })
  @ApiCreatedResponse({ description: 'The autobiography was created.' })
  create(
    @AuthenticatedUser() user: SafeUser,
    @Body() input: CreateStoryDto,
  ): Promise<Story> {
    return this.storiesService.create(user.id, input);
  }

  @Get()
  @ApiOperation({ summary: "List the authenticated user's autobiographies" })
  @ApiOkResponse({ description: 'Owned autobiographies.' })
  list(
    @AuthenticatedUser() user: SafeUser,
    @Query() query: ListStoriesDto,
  ): Promise<Story[]> {
    return this.storiesService.list(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one owned autobiography' })
  @ApiOkResponse({ description: 'The requested autobiography.' })
  @ApiNotFoundResponse({ description: 'Story not found.' })
  get(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) storyId: string,
  ): Promise<Story> {
    return this.storiesService.get(user.id, storyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one owned autobiography' })
  @ApiOkResponse({ description: 'The autobiography was updated.' })
  update(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) storyId: string,
    @Body() input: UpdateStoryDto,
  ): Promise<Story> {
    return this.storiesService.update(user.id, storyId, input);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive an owned autobiography' })
  archive(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) storyId: string,
  ): Promise<Story> {
    return this.storiesService.archive(user.id, storyId);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived autobiography as a draft' })
  restore(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) storyId: string,
  ): Promise<Story> {
    return this.storiesService.restore(user.id, storyId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete an owned autobiography' })
  @ApiNoContentResponse({ description: 'The autobiography was deleted.' })
  async delete(
    @AuthenticatedUser() user: SafeUser,
    @Param('id', new ParseUUIDPipe()) storyId: string,
    @Body() input: DeleteStoryDto,
  ): Promise<void> {
    await this.storiesService.delete(user.id, storyId, input);
  }
}
