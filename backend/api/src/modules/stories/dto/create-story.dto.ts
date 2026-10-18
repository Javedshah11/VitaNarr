import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { STORY_COVER_KEYS, type StoryCoverKey } from '../story.constants.js';

export class CreateStoryDto {
  @ApiProperty({ example: 'The Story of My Life', maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @ApiPropertyOptional({
    example: 'A journey through family, learning and change',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @ApiPropertyOptional({ maxLength: 2_000 })
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string;

  @ApiPropertyOptional({ enum: STORY_COVER_KEYS })
  @IsOptional()
  @IsIn(STORY_COVER_KEYS)
  coverKey?: StoryCoverKey;

  @ApiPropertyOptional({ example: 'English', default: 'English' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  writingLanguage?: string;
}
