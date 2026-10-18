import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteStoryDto {
  @ApiProperty({
    description: 'The exact current story title, required to confirm deletion.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  confirmationTitle!: string;
}
