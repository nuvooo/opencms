import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateMediaDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  altText?: string;
}
