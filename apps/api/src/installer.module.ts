import { validateEnv } from '@/common/utils';
import { SetupModule } from '@/features/setup/setup.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Minimal application served during first-run setup. It exposes only the setup
 * endpoints and intentionally omits the database connection, global auth/role/
 * throttle guards and every feature module, so the installer is reachable on a
 * machine that has no database configured yet.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    SetupModule,
  ],
})
export class InstallerModule {}
