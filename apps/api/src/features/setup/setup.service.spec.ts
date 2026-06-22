import { BadRequestException, ConflictException } from '@nestjs/common';
import { LockedException, SetupService } from './setup.service';

jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockRejectedValue(new Error('connect failed')),
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('SetupService', () => {
  const makeService = () => {
    const stateRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const userRepo = {
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    const tx = {
      runInTransaction: jest.fn(),
    };
    const envService = {
      writeAllowlisted: jest.fn(),
    };

    const service = new SetupService(
      stateRepo as any,
      userRepo as any,
      tx as any,
      envService as any,
    );

    return { service, stateRepo, userRepo, tx, envService };
  };

  it('returns initialized/inProgress status', async () => {
    const { service, stateRepo } = makeService();
    stateRepo.findOne.mockResolvedValue({
      id: 'singleton',
      is_initialized: false,
      setup_in_progress: false,
    });

    await expect(service.getStatus()).resolves.toEqual({
      initialized: false,
      inProgress: false,
    });
  });

  it('reports initialized when an admin already exists even if the state flag is false', async () => {
    const { service, stateRepo, userRepo } = makeService();
    const state = {
      id: 'singleton',
      is_initialized: false,
      setup_in_progress: false,
      initialized_at: null,
    };
    stateRepo.findOne.mockResolvedValue(state);
    stateRepo.save.mockImplementation(async (value: any) => value);
    userRepo.count.mockResolvedValue(1);

    await expect(service.getStatus()).resolves.toEqual({
      initialized: true,
      inProgress: false,
    });
    // and it locks the installer by persisting the flag
    expect(stateRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ is_initialized: true }),
    );
  });

  it('throws 409 when bootstrap called after initialization', async () => {
    const { service, stateRepo } = makeService();
    stateRepo.findOne.mockResolvedValue({
      id: 'singleton',
      is_initialized: true,
      setup_in_progress: false,
    });

    await expect(service.bootstrap({} as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('throws LockedException when bootstrap is already in progress', async () => {
    const { service, stateRepo } = makeService();
    stateRepo.findOne.mockResolvedValue({
      id: 'singleton',
      is_initialized: false,
      setup_in_progress: true,
    });

    await expect(service.bootstrap({} as any)).rejects.toBeInstanceOf(
      LockedException,
    );
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

  it('bootstraps setup and marks state initialized', async () => {
    const { service, stateRepo, userRepo, tx, envService } = makeService();
    const state = {
      id: 'singleton',
      is_initialized: false,
      setup_in_progress: false,
      initialized_at: null,
    };
    stateRepo.findOne.mockResolvedValue(state);
    stateRepo.save.mockImplementation(async (value: any) => value);
    userRepo.findOne.mockResolvedValue(null);

    tx.runInTransaction.mockImplementation(async (fn: any) => {
      const manager = {
        create: jest.fn((_: unknown, payload: any) => payload),
        save: jest.fn(async (_: unknown, payload: any) => ({
          id: payload.id ?? 'generated-user-id',
          ...payload,
        })),
      };

      return fn(manager);
    });

    jest.spyOn(service, 'validateDatabase').mockResolvedValue(undefined);

    await service.bootstrap({
      app: {
        allowCorsUrl: 'http://localhost:3000',
        authSecret: 'secret',
      },
      database: {
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'password',
        name: 'cms',
        ssl: false,
      },
      admin: {
        email: 'admin@example.com',
        password: 'Password123!',
      },
    });

    expect(envService.writeAllowlisted).toHaveBeenCalledWith(
      expect.objectContaining({
        DB_HOST: 'localhost',
        AUTH_SECRET: 'secret',
        DB_SSL: 'false',
      }),
    );
    expect(stateRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        is_initialized: true,
        setup_in_progress: false,
      }),
    );
  });

  it('creates admin without username so entity hook generates it', async () => {
    const { service, stateRepo, userRepo, tx } = makeService();
    const state = {
      id: 'singleton',
      is_initialized: false,
      setup_in_progress: false,
      initialized_at: null,
    };
    stateRepo.findOne.mockResolvedValue(state);
    stateRepo.save.mockImplementation(async (value: any) => value);
    userRepo.findOne.mockResolvedValue(null);

    let createdUserPayload: any;
    tx.runInTransaction.mockImplementation(async (fn: any) => {
      const manager = {
        create: jest.fn((entity: unknown, payload: any) => {
          if (payload && 'email' in payload) {
            createdUserPayload = payload;
          }

          return payload;
        }),
        save: jest.fn(async (_: unknown, payload: any) => ({
          id: payload.id ?? 'generated-user-id',
          ...payload,
        })),
      };

      return fn(manager);
    });

    jest.spyOn(service, 'validateDatabase').mockResolvedValue(undefined);

    await service.bootstrap({
      app: {
        allowCorsUrl: 'http://localhost:3000',
        authSecret: 'secret',
      },
      database: {
        host: 'localhost',
        port: '5432',
        username: 'postgres',
        password: 'password',
        name: 'cms',
        ssl: false,
      },
      admin: {
        email: 'admin@example.com',
        password: 'Password123!',
      },
    });

    expect(createdUserPayload).toBeDefined();
    expect(createdUserPayload.username).toBeUndefined();
  });

  it('releases setup lock when bootstrap fails', async () => {
    const { service, stateRepo } = makeService();
    const state = {
      id: 'singleton',
      is_initialized: false,
      setup_in_progress: false,
      initialized_at: null,
    };
    stateRepo.findOne.mockResolvedValue(state);
    stateRepo.save.mockImplementation(async (value: any) => value);

    jest
      .spyOn(service, 'validateDatabase')
      .mockRejectedValue(new BadRequestException('Database connection failed'));

    await expect(
      service.bootstrap({
        app: {
          allowCorsUrl: 'http://localhost:3000',
          authSecret: 'secret',
        },
        database: {
          host: 'localhost',
          port: '5432',
          username: 'postgres',
          password: 'password',
          name: 'cms',
          ssl: false,
        },
        admin: {
          email: 'admin@example.com',
          password: 'Password123!',
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(stateRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ setup_in_progress: false }),
    );
  });
});
