import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'My Tenant' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'my-tenant' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'tenant.example.com' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ example: ['en', 'de'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  locales?: string[];
}
