import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SetupCompletionSignal } from './setup-completion.signal';
import * as envUtil from './setup-env.util';
import { LockedException, SetupService } from './setup.service';

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockRejectedValue(new Error('connect failed')),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

/**
 * Stubs the short-lived bootstrap DataSource so the orchestration (schema +
 * admin creation, env write, completion signal) can be tested without a real
 * driver. The provided manager fakes a clean database (no existing admin).
 */
const stubDataSource = () => {
  jest
    .spyOn(DataSource.prototype, 'initialize')
    .mockResolvedValue(undefined as never);
  jest
    .spyOn(DataSource.prototype, 'destroy')
    .mockResolvedValue(undefined as never);
  jest
    .spyOn(DataSource.prototype, 'transaction')
    .mockImplementation(async (runOrIsolation: unknown) => {
      const run = runOrIsolation as (manager: unknown) => Promise<unknown>;
      const manager = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((_entity: unknown, payload: unknown) => payload),
        save: jest.fn(async (_entity: unknown, payload: any) => ({
          id: payload.id ?? 'generated-user-id',
          ...payload,
        })),
      };
      return run(manager);
    });
};

describe('SetupService', () => {
  const makeService = () => {
    const envService = {
      writeAllowlisted: jest.fn(),
    };
    const completion = new SetupCompletionSignal();

    const service = new SetupService(envService as any, completion);

    return { service, envService, completion };
  };

  // Use an isolated in-memory SQLite database so bootstrap exercises the real
  // schema synchronisation and admin creation without touching a DB server.
  const sqliteBootstrapDto = (email = 'admin@example.com') => ({
    app: {
      allowCorsUrl: 'http://localhost:3000',
      authSecret: 'secret',
      authUrl: 'http://localhost:3000',
    },
    database: {
      type: 'sqlite' as const,
      database: ':memory:',
    },
    admin: {
      email,
      password: 'Password123!',
    },
  });

  beforeEach(() => {
    jest.spyOn(envUtil, 'isSetupComplete').mockReturnValue(false);
    stubDataSource();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns initialized/inProgress status from the env flag', () => {
    const { service } = makeService();

    expect(service.getStatus()).toEqual({
      initialized: false,
      inProgress: false,
    });
  });

  it('reports initialized once the env flag is set', () => {
    const { service } = makeService();
    (envUtil.isSetupComplete as jest.Mock).mockReturnValue(true);

    expect(service.getStatus()).toEqual({
      initialized: true,
      inProgress: false,
    });
  });

  it('throws 409 when bootstrap is called after initialization', async () => {
    const { service } = makeService();
    (envUtil.isSetupComplete as jest.Mock).mockReturnValue(true);

    await expect(
      service.bootstrap(sqliteBootstrapDto()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws LockedException when bootstrap is already in progress', async () => {
    const { service } = makeService();
    // Hold validateDatabase open so a second call observes inProgress=true.
    let release: () => void = () => undefined;
    jest
      .spyOn(service, 'validateDatabase')
      .mockImplementation(
        () => new Promise<void>((resolve) => (release = resolve)),
      );

    const first = service.bootstrap(sqliteBootstrapDto());
    await Promise.resolve();

    await expect(
      service.bootstrap(sqliteBootstrapDto()),
    ).rejects.toBeInstanceOf(LockedException);

    release();
    await first;
  });

  it('maps database connection errors to 400', async () => {
    const { service } = makeService();

    await expect(
      service.validateDatabase({
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'password',
        name: 'cms',
        ssl: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bootstraps: creates schema + admin, writes env and signals completion', async () => {
    const { service, envService, completion } = makeService();

    let completed = false;
    void completion.waitUntilComplete().then(() => (completed = true));

    await service.bootstrap(sqliteBootstrapDto());

    expect(envService.writeAllowlisted).toHaveBeenCalledWith(
      expect.objectContaining({
        DB_TYPE: 'sqlite',
        AUTH_SECRET: 'secret',
        SETUP_COMPLETE: 'true',
      }),
    );

    await Promise.resolve();
    expect(completed).toBe(true);
    expect(service.getStatus().inProgress).toBe(false);
  });

  it('releases the setup lock when bootstrap fails', async () => {
    const { service } = makeService();

    jest
      .spyOn(service, 'validateDatabase')
      .mockRejectedValue(new BadRequestException('Database connection failed'));

    await expect(
      service.bootstrap(sqliteBootstrapDto()),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(service.getStatus().inProgress).toBe(false);
  });
});
