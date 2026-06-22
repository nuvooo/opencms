import { AppModule } from '@/app.module';
import { bootstrap } from '@/bootstrap';
import { SetupCompletionSignal } from '@/features/setup/setup-completion.signal';
import { isSetupComplete, reloadEnv } from '@/features/setup/setup-env.util';
import { bootstrapInstaller } from '@/installer.bootstrap';
import { InstallerModule } from '@/installer.module';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

/**
 * Boots the API in two phases. On a fresh install (no `SETUP_COMPLETE=true` in
 * `.env`) it first serves the lightweight installer so the web setup wizard can
 * choose and provision a database. Once the wizard finishes, the installer is
 * torn down and the full application is started against the chosen database —
 * no manual restart required.
 *
 * @returns {Promise<void>} Resolves when the application has started.
 */
const main = async (): Promise<void> => {
  if (!isSetupComplete()) {
    const installer = await NestFactory.create<NestFastifyApplication>(
      InstallerModule,
      new FastifyAdapter(),
      { bufferLogs: true },
    );
    await bootstrapInstaller(installer);
    console.log(
      '[setup] Installer ready — open the web app and complete the setup wizard.',
    );

    await installer.get(SetupCompletionSignal).waitUntilComplete();
    await installer.close();

    // Make the freshly written database configuration visible to the full app.
    reloadEnv();
    console.log('[setup] Setup complete — starting the application.');
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );
  await bootstrap(app);
};

/**
 * Invokes the main bootstrap function and handles any errors.
 *
 * @returns {void}
 */
main().catch((error) => {
  console.log(error);
  process.exit(1);
});
