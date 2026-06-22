import { Injectable } from '@nestjs/common';

/**
 * One-shot signal resolved when the installer finishes bootstrapping. `main.ts`
 * awaits {@link waitUntilComplete} while the lightweight installer application
 * is serving, then tears it down and boots the full application against the
 * freshly configured database.
 */
@Injectable()
export class SetupCompletionSignal {
  private resolve!: () => void;
  private readonly promise = new Promise<void>((resolve) => {
    this.resolve = resolve;
  });

  /** Marks setup as complete, unblocking {@link waitUntilComplete}. */
  complete(): void {
    this.resolve();
  }

  /** Resolves once {@link complete} has been called. */
  waitUntilComplete(): Promise<void> {
    return this.promise;
  }
}
