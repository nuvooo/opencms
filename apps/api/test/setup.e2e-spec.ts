import { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { SetupController } from '../src/features/setup/setup.controller';
import { SetupService } from '../src/features/setup/setup.service';
import request = require('supertest');

describe('Setup (e2e)', () => {
  let app: INestApplication;

  const setupService = {
    getStatus: jest
      .fn()
      .mockResolvedValue({ initialized: false, inProgress: false }),
    validateDatabase: jest.fn(),
    bootstrap: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SetupController],
      providers: [
        {
          provide: SetupService,
          useValue: setupService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /setup/status returns shape', async () => {
    const res = await request(app.getHttpServer()).get('/setup/status');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('initialized');
    expect(res.body).toHaveProperty('inProgress');
  });
});
