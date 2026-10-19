import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const INTERVIEW_TOPIC_CATEGORIES = [
  'childhood',
  'family',
  'education',
  'friendship',
  'career',
  'travel',
  'celebration',
  'challenge',
  'achievement',
  'other',
] as const;

export class StartInterviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  focusArea?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  language?: string;
}

export class ListInterviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class RecordInterviewAnswerDto {
  @IsUUID('4')
  questionId!: string;

  @IsOptional()
  @IsBoolean()
  skipped?: boolean;

  @ValidateIf((input: RecordInterviewAnswerDto) => !input.skipped)
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  content?: string;
}

export class UpdateInterviewTopicDto {
  @IsIn(['skipped', 'unexplored'])
  status!: 'skipped' | 'unexplored';
}
