import { Module } from '@nestjs/common';
import { SetupCompletionSignal } from './setup-completion.signal';
import { SetupEnvService } from './setup-env.service';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

/**
 * Setup feature. Depends on no database connection so it can run inside both
 * the lightweight installer application (pre-database) and the full
 * application. {@link SetupCompletionSignal} is exported so the bootstrapper can
 * await installer completion.
 */
@Module({
  controllers: [SetupController],
  providers: [SetupService, SetupEnvService, SetupCompletionSignal],
  exports: [SetupCompletionSignal],
})
export class SetupModule {}
