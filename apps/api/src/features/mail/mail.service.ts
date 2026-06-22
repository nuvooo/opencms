import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_NAME } from '@repo/constants/app';
import { Logger } from 'nestjs-pino';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
    private readonly logger: Logger,
  ) {}

  async sendEmail(mailOptions: ISendMailOptions): Promise<void> {
    try {
      const fromEmail =
        this.config.get('MAIL_USERNAME') || 'noreply@example.com';
      await this.mailerService.sendMail({
        from: `${APP_NAME}<${fromEmail}>`,
        ...mailOptions,
      });
    } catch (error) {
      this.logger.warn(`Failed to send email: ${(error as Error).message}`);
    }
  }
}
