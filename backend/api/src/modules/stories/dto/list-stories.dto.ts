import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { STORY_STATUSES, type StoryStatus } from '../story.constants.js';

export const STORY_SORT_FIELDS = ['updatedAt', 'createdAt', 'title'] as const;
export type StorySortField = (typeof STORY_SORT_FIELDS)[number];

export class ListStoriesDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @ApiPropertyOptional({ enum: STORY_STATUSES })
  @IsOptional()
  @IsIn(STORY_STATUSES)
  status?: StoryStatus;

  @ApiPropertyOptional({ enum: STORY_SORT_FIELDS, default: 'updatedAt' })
  @IsOptional()
  @IsIn(STORY_SORT_FIELDS)
  sort?: StorySortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
