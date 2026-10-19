import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  DATE_PRECISIONS,
  MEMORY_CATEGORIES,
  type DatePrecision,
  type MemoryCategory,
} from '../../memories/memory.constants.js';

export class UpdateExtractionDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(20_000) description?: string;
  @IsOptional() @IsIn(MEMORY_CATEGORIES) category?: MemoryCategory;
  @IsOptional() @IsDateString({ strict: true }) eventDate?: string | null;
  @IsOptional() @IsIn(DATE_PRECISIONS) datePrecision?: DatePrecision;
  @IsOptional() @IsString() @MaxLength(255) location?: string | null;
}

export class ApproveExtractionDto extends UpdateExtractionDto {
  @IsOptional() @Type(() => Boolean) @IsBoolean() createTimelineEvent?: boolean;
}
