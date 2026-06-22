import { Env } from '@/common/utils';
import helmet from '@fastify/helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

/**
 * Configures and starts the lightweight installer application. Kept separate
 * from the full {@link bootstrap} because the installer has no logger module,
 * static asset storage, swagger or multipart support — it only needs the setup
 * endpoints to be reachable and validated.
 *
 * @param app - The installer NestFastifyApplication instance.
 * @returns Resolves once the installer is listening.
 */
export const bootstrapInstaller = async (
  app: NestFastifyApplication,
): Promise<void> => {
  const configService = app.get(ConfigService<Env>);

  await app.register(helmet, {
    global: true,
    permittedCrossDomainPolicies: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  app.setGlobalPrefix('api');

  app.enableCors({
    credentials: true,
    origin: configService.get('ALLOW_CORS_URL').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(configService.get('PORT')!, '0.0.0.0', () => undefined);
};
