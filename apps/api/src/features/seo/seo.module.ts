import { Tenant } from '@/tenants/tenant.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeoSettings } from './entities/seo-settings.entity';
import { SeoController, SeoPublicController } from './seo.controller';
import { SeoService } from './seo.service';

/**
 * SEO feature module. Ships with the CMS but stays gated behind the `seo`
 * marketplace plugin via `@RequiresPlugin('seo')` on its controllers.
 *
 * `Tenant` is registered for {@link TenantInterceptor}, which resolves the
 * active tenant on every SEO route.
 */
@Module({
  imports: [TypeOrmModule.forFeature([SeoSettings, Tenant])],
  controllers: [SeoController, SeoPublicController],
  providers: [SeoService],
})
export class SeoModule {}
