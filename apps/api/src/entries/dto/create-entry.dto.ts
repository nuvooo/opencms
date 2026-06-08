import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEntryDto {
  @ApiProperty({ example: 'blog-post' })
  @IsString()
  @IsNotEmpty()
  content_type_slug: string;

  @ApiProperty({ example: { title: 'Hello World', body: 'Content here' } })
  @IsObject()
  fields: Record<string, any>;

  @ApiPropertyOptional({ example: 'en', default: 'en' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  @IsOptional()
  @IsEnum(['draft', 'published', 'archived'])
  status?: string;
}
