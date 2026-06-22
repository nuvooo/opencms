import { Env } from '@/common/utils';
import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * Module for configuring and providing the Nodemailer-based mailer service.
 *
 * Sets up the mail transport using environment variables for host, username, and password.
 * Integrates with NestJS ConfigModule for dynamic configuration.
 */
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => {
        const port = config.get('MAIL_PORT');
        const username = config.get('MAIL_USERNAME');
        const password = config.get('MAIL_PASSWORD');
        const auth =
          username && password ? { user: username, pass: password } : undefined;
        if (port) {
          return {
            transport: {
              host: config.get('MAIL_HOST'),
              port,
              ignoreTLS: config.get('MAIL_IGNORE_TLS') ?? true,
              ...(auth ? { auth } : {}),
            },
          };
        }
        return {
          transport: {
            service: config.get('MAIL_HOST'),
            ...(auth ? { auth } : {}),
          },
        };
      },
    }),
  ],
})
export class NodeMailerModule {}
