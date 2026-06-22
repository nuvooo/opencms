import { Global, Module } from '@nestjs/common';
import { TenantDbService } from './services';

/**
 * Global module for cross-cutting providers.
 *
 * {@link TenantDbService} owns a single tenant DataSource (with init/destroy
 * lifecycle), so it must be a single shared instance. Exporting it from a
 * `@Global()` module makes it injectable in every feature module
 * (content-types, entries, locales, relations, …) without re-providing it.
 */
@Global()
@Module({
  providers: [TenantDbService],
  exports: [TenantDbService],
})
export class CommonModule {}
