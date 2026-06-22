import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateLocaleDto {
  @ApiProperty({ example: 'de' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'German' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
