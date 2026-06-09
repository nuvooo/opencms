import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const FIELD_TYPES = [
  'text',
  'textarea',
  'rich_text',
  'number',
  'boolean',
  'date',
  'image',
  'select',
  'repeater',
  'slug',
  'color',
  'json',
  'datetime',
  'time',
  'email',
  'url',
  'phone',
  'm2o',
  'o2m',
  'm2m',
] as const;

export class ContentTypeField {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: FIELD_TYPES })
  @IsEnum(FIELD_TYPES)
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}

export class CreateContentTypeDto {
  @ApiProperty({ example: 'Blog Post' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'blog-post' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'A blog post content type' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [ContentTypeField] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContentTypeField)
  fields?: ContentTypeField[];
}
