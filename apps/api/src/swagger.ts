import { Env } from '@/common/utils';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Sets up Swagger API documentation for the application.
 *
 * createDocument runs after setGlobalPrefix('api'), so the documented operation
 * paths already include the `/api` prefix (e.g. `/api/locales`). The server must
 * therefore be the bare API origin (NOT including `/api`), otherwise "Try it
 * out" would target a doubled `/api/api/...` path. An absolute origin also lets
 * the UI work when opened through the web app's proxy (CORS allows it).
 *
 * @param {NestFastifyApplication} app - The NestJS Fastify application instance.
 * @returns {Promise<void>} A promise that resolves when Swagger is set up.
 */
export const swagger = async (app: NestFastifyApplication): Promise<void> => {
  const config = app.get(ConfigService<Env, true>);
  const host = config.get('HOST', { infer: true }) ?? 'localhost';
  const port = config.get('PORT', { infer: true }) ?? 8000;

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Turbo repo')
    .addBearerAuth()
    .addServer(`http://${host}:${port}`)
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);
};
