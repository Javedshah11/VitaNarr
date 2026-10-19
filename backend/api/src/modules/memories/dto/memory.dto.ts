import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
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
} from '../memory.constants.js';

export class CreateMemoryDto {
  @IsString() @MinLength(1) @MaxLength(180) title!: string;
  @IsString() @MinLength(1) @MaxLength(20_000) description!: string;
  @IsOptional() @IsIn(MEMORY_CATEGORIES) category?: MemoryCategory;
  @IsOptional() @IsDateString({ strict: true }) eventDate?: string;
  @IsOptional() @IsIn(DATE_PRECISIONS) datePrecision?: DatePrecision;
  @IsOptional() @IsString() @MaxLength(255) location?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  emotionalSignificance?: number;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(48, { each: true })
  tags?: string[];
}

export class UpdateMemoryDto extends CreateMemoryDto {
  @IsOptional() declare title: string;
  @IsOptional() declare description: string;
}

export class ListMemoriesDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsIn(MEMORY_CATEGORIES) category?: MemoryCategory;
  @IsOptional() @IsDateString({ strict: true }) from?: string;
  @IsOptional() @IsDateString({ strict: true }) to?: string;
  @IsOptional() @IsIn(['eventDate', 'createdAt']) sort?:
    'eventDate' | 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
