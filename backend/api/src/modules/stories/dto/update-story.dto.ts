import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  STORY_COVER_KEYS,
  STORY_STATUSES,
  type StoryCoverKey,
  type StoryStatus,
} from '../story.constants.js';

export class UpdateStoryDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ maxLength: 255, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({ maxLength: 2_000, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({ enum: STORY_COVER_KEYS, nullable: true })
  @IsOptional()
  @IsIn(STORY_COVER_KEYS)
  coverKey?: StoryCoverKey;

  @ApiPropertyOptional({ maxLength: 64 })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  writingLanguage?: string;

  @ApiPropertyOptional({ enum: STORY_STATUSES })
  @IsOptional()
  @IsIn(STORY_STATUSES)
  status?: StoryStatus;
}
