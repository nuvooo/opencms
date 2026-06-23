import { Public, Roles } from '@/common/decorators';
import { TenantInterceptor } from '@/common/interceptors/tenant.interceptor';
import { RequiresPlugin } from '@/features/plugin/requires-plugin.decorator';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Put,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { UpdateSeoSettingsDto } from './dto/update-seo-settings.dto';
import { SeoService } from './seo.service';

const TENANT_HEADER = {
  name: 'x-tenant-id',
  description: 'Active tenant id (required for tenant-scoped routes)',
  required: true,
} as const;

/**
 * Admin API for the SEO plugin. Gated by `@RequiresPlugin('seo')` so it returns
 * 403 while the plugin is disabled, and tenant-scoped via {@link TenantInterceptor}.
 */
@ApiTags('seo')
@ApiBearerAuth()
@ApiHeader(TENANT_HEADER)
@UseInterceptors(TenantInterceptor)
@RequiresPlugin('seo')
@Controller('seo')
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('settings')
  @Roles('ADMIN')
  async getSettings(@Req() req: any) {
    const data = await this.seo.getSettings(req.tenant.id);
    return { message: 'SEO settings fetched successfully', data };
  }

  @Put('settings')
  @Roles('ADMIN')
  async updateSettings(@Req() req: any, @Body() dto: UpdateSeoSettingsDto) {
    const data = await this.seo.updateSettings(req.tenant.id, dto);
    return { message: 'SEO settings updated successfully', data };
  }
}

/**
 * Public, crawler-facing endpoints. Still gated by the plugin (a disabled SEO
 * plugin serves nothing) but unauthenticated, and resolved per tenant from the
 * `x-tenant-id` header.
 */
@ApiTags('seo')
@ApiHeader(TENANT_HEADER)
@UseInterceptors(TenantInterceptor)
@RequiresPlugin('seo')
@Controller('seo')
export class SeoPublicController {
  constructor(private readonly seo: SeoService) {}

  @Get('robots.txt')
  @Public()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async robots(@Req() req: any): Promise<string> {
    return this.seo.buildRobotsTxt(req.tenant.id);
  }

  @Get('sitemap.xml')
  @Public()
  @Header('Content-Type', 'application/xml; charset=utf-8')
  async sitemap(@Req() req: any): Promise<string> {
    const settings = await this.seo.getSettings(req.tenant.id);
    if (!settings.sitemapEnabled) {
      throw new ForbiddenException('Sitemap is disabled');
    }
    return this.seo.buildSitemap(req.tenant.id, req.tenant.schemaName);
  }
}
