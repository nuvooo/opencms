import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ContentTypeField {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: [
      'text',
      'textarea',
      'rich_text',
      'number',
      'boolean',
      'date',
      'image',
      'select',
      'repeater',
    ],
  })
  @IsEnum([
    'text',
    'textarea',
    'rich_text',
    'number',
    'boolean',
    'date',
    'image',
    'select',
    'repeater',
  ])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  options?: any;
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
