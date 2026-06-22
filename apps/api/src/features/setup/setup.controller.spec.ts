import { IS_PUBLIC_KEY } from '@/common/decorators';
import { BootstrapSetupDto } from './dto/bootstrap-setup.dto';
import { ValidateDbDto } from './dto/validate-db.dto';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

describe('SetupController', () => {
  const makeController = () => {
    const setupService = {
      getStatus: jest.fn(),
      validateDatabase: jest.fn(),
      bootstrap: jest.fn(),
    } satisfies Partial<SetupService>;

    const controller = new SetupController(
      setupService as unknown as SetupService,
    );
    return { controller, setupService };
  };

  it('returns setup status', () => {
    const { controller, setupService } = makeController();
    const response = { initialized: false, inProgress: false };
    setupService.getStatus.mockReturnValue(response);

    expect(controller.status()).toEqual(response);
  });

  it('validates database connection', async () => {
    const { controller, setupService } = makeController();
    const dto: ValidateDbDto = {
      host: 'localhost',
      port: '5432',
      username: 'postgres',
      password: 'password',
      name: 'cms',
      ssl: false,
    };

    setupService.validateDatabase.mockResolvedValue(undefined);

    await expect(controller.validateDb(dto)).resolves.toEqual({ ok: true });
    expect(setupService.validateDatabase).toHaveBeenCalledWith(dto);
  });

  it('bootstraps setup', async () => {
    const { controller, setupService } = makeController();
    const dto: BootstrapSetupDto = {
      app: {
        allowCorsUrl: 'http://localhost:3000',
        authSecret: 'secret',
        authUrl: 'http://localhost:3001',
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
    };

    setupService.bootstrap.mockResolvedValue(undefined);

    await expect(controller.bootstrap(dto)).resolves.toEqual({
      message: 'Installation completed',
    });
    expect(setupService.bootstrap).toHaveBeenCalledWith(dto);
  });

  it('marks status route as public', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SetupController.prototype.status),
    ).toBe(true);
  });

  it('marks validateDb route as public', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SetupController.prototype.validateDb),
    ).toBe(true);
  });

  it('marks bootstrap route as public', () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, SetupController.prototype.bootstrap),
    ).toBe(true);
  });
});
