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
import { UsersModule } from '@/features/users/users.module';
import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { AuthModule } from './features/auth/auth.module';
import { HealthModule } from './features/health/health.module';
import { MailModule } from './features/mail/mail.module';
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
    NodeMailerModule,
    LoggerModule,
    ThrottleModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    MailModule,
    HealthModule,
    FileModule,
    ContentTypesModule,
    EntriesModule,
    TenantsModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes(
        { path: 'content-types', method: RequestMethod.ALL },
        { path: 'entries', method: RequestMethod.ALL },
      );
  }
}
