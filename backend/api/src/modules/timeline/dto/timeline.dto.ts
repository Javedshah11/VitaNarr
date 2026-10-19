import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  DATE_PRECISIONS,
  MEMORY_CATEGORIES,
  type DatePrecision,
  type MemoryCategory,
} from '../../memories/memory.constants.js';

export class CreateTimelineEventDto {
  @IsString() @MinLength(1) @MaxLength(180) title!: string;
  @IsOptional() @IsString() @MaxLength(20_000) description?: string;
  @IsOptional() @IsDateString({ strict: true }) eventDate?: string;
  @IsOptional() @IsIn(DATE_PRECISIONS) datePrecision?: DatePrecision;
  @IsOptional() @IsString() @MaxLength(255) location?: string;
  @IsOptional() @IsIn(MEMORY_CATEGORIES) category?: MemoryCategory;
  @IsOptional() @IsString() @MaxLength(100) lifeStage?: string;
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) memoryIds?: string[];
}
export class UpdateTimelineEventDto extends CreateTimelineEventDto {
  @IsOptional() declare title: string;
}
export class ListTimelineEventsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
export class TimelineMemoryLinkDto {
  @IsUUID('4') memoryId!: string;
}
