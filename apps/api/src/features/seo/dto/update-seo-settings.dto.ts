import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSeoSettingsDto {
  @ApiPropertyOptional({ description: 'Canonical base URL, no trailing slash' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  siteUrl?: string;

  @ApiPropertyOptional({ description: 'Site name used in the title template' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  siteName?: string;

  @ApiPropertyOptional({ description: 'Title pattern; %s is the page title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleTemplate?: string;

  @ApiPropertyOptional({ description: 'Fallback meta description' })
  @IsOptional()
  @IsString()
  defaultDescription?: string;

  @ApiPropertyOptional({ description: 'Raw robots.txt body' })
  @IsOptional()
  @IsString()
  robotsTxt?: string;

  @ApiPropertyOptional({ description: 'Whether sitemap.xml is served' })
  @IsOptional()
  @IsBoolean()
  sitemapEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Default Open Graph / social image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  ogImageUrl?: string;

  @ApiPropertyOptional({ description: 'Default @handle for Twitter cards' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  twitterHandle?: string;
}
