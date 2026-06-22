import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import {
  LoggerModule,
  NodeMailerModule,
  ThrottleModule,
} from '@/common/modules';
import { validateEnv } from '@/common/utils';
import { ContentTypesModule } from '@/content-types/content-types.module';
import { DatabaseModule } from '@/database';
import { EntriesModule } from '@/entries/entries.module';
import { FileModule } from '@/features/file/file.module';
import { MediaModule } from '@/features/media/media.module';
import { PluginModule } from '@/features/plugin/plugin.module';
import { SetupModule } from '@/features/setup/setup.module';
import { UsersModule } from '@/features/users/users.module';
import { LocaleModule } from '@/locale/locale.module';
import { RelationModule } from '@/relation/relation.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { ApiTokenModule } from './features/api-token/api-token.module';
import { AuthModule } from './features/auth/auth.module';
import { HealthModule } from './features/health/health.module';
import { MailModule } from './features/mail/mail.module';
import { PluginEnabledGuard } from './features/plugin/plugin-enabled.guard';
import { Tenant } from './tenants/tenant.entity';
import { TenantsModule } from './tenants/tenants.module';

/**
 * The root module of the application.
 *
 * Configures global guards, environment validation, and imports all feature modules.
 */
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PluginEnabledGuard,
    },
  ],
  imports: [
    JwtModule.register({
      global: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forFeature([Tenant]),
    CommonModule,
    NodeMailerModule,
    LoggerModule,
    ThrottleModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    MailModule,
    HealthModule,
    FileModule,
    ApiTokenModule,
    ContentTypesModule,
    EntriesModule,
    LocaleModule,
    RelationModule,
    TenantsModule,
    MediaModule,
    PluginModule,
    SetupModule,
  ],
})
export class AppModule {}
