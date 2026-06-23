jest.mock('@/common/guards', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { ROLES_KEY } from '@/common/decorators';
import { MemoryStorageFile } from '@blazity/nest-file-fastify';
import { Test } from '@nestjs/testing';
import { PluginFilesService } from './plugin-files.service';
import { PluginMarketplaceService } from './plugin-marketplace.service';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginController } from './plugin.controller';

describe('PluginController', () => {
  it('returns plugins list', async () => {
    const getAll = jest.fn().mockReturnValue([{ id: 'dashboard' }]);

    const module = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        {
          provide: PluginRegistryService,
          useValue: {
            getAll,
          },
        },
        {
          provide: PluginFilesService,
          useValue: {
            installFromZip: jest.fn(),
            uninstall: jest.fn(),
          },
        },
        {
          provide: PluginMarketplaceService,
          useValue: { getMarketplace: jest.fn(), install: jest.fn() },
        },
      ],
    }).compile();

    const controller = module.get(PluginController);
    expect(controller.findAll()).toEqual({
      message: 'Plugins fetched successfully',
      data: [{ id: 'dashboard' }],
    });
    expect(getAll).toHaveBeenCalledTimes(1);
  });

  it('rescans plugins', async () => {
    const rescan = jest.fn().mockReturnValue([{ id: 'dashboard' }]);

    const module = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        {
          provide: PluginRegistryService,
          useValue: {
            rescan,
          },
        },
        {
          provide: PluginFilesService,
          useValue: {
            installFromZip: jest.fn(),
            uninstall: jest.fn(),
          },
        },
        {
          provide: PluginMarketplaceService,
          useValue: { getMarketplace: jest.fn(), install: jest.fn() },
        },
      ],
    }).compile();

    const controller = module.get(PluginController);
    expect(controller.rescan()).toEqual({
      message: 'Plugins rescanned successfully',
      data: [{ id: 'dashboard' }],
    });
    expect(rescan).toHaveBeenCalledTimes(1);
  });

  it('installs plugin from uploaded zip then rescans', async () => {
    const installFromZip = jest.fn().mockReturnValue('seo-tools');
    const rescan = jest.fn().mockReturnValue([{ id: 'seo-tools' }]);

    const module = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        {
          provide: PluginRegistryService,
          useValue: {
            rescan,
          },
        },
        {
          provide: PluginFilesService,
          useValue: {
            installFromZip,
            uninstall: jest.fn(),
          },
        },
        {
          provide: PluginMarketplaceService,
          useValue: { getMarketplace: jest.fn(), install: jest.fn() },
        },
      ],
    }).compile();

    const controller = module.get(PluginController);
    const file = { buffer: Buffer.from('zip') } as MemoryStorageFile;

    expect(controller.install(file)).toEqual({
      message: 'Plugin seo-tools installed successfully',
      data: [{ id: 'seo-tools' }],
    });
    expect(installFromZip).toHaveBeenCalledWith(file);
    expect(rescan).toHaveBeenCalledTimes(1);
  });

  it('asserts removable before uninstall and rescans', async () => {
    const assertRemovable = jest.fn();
    const uninstall = jest.fn();
    const rescan = jest.fn().mockReturnValue([]);

    const module = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        {
          provide: PluginRegistryService,
          useValue: {
            assertRemovable,
            rescan,
          },
        },
        {
          provide: PluginFilesService,
          useValue: {
            installFromZip: jest.fn(),
            uninstall,
          },
        },
        {
          provide: PluginMarketplaceService,
          useValue: { getMarketplace: jest.fn(), install: jest.fn() },
        },
      ],
    }).compile();

    const controller = module.get(PluginController);

    expect(controller.uninstall('seo-tools')).toEqual({
      message: 'Plugin removed successfully',
      data: [],
    });
    expect(assertRemovable).toHaveBeenCalledWith('seo-tools');
    expect(uninstall).toHaveBeenCalledWith('seo-tools');
    expect(rescan).toHaveBeenCalledTimes(1);
  });

  it('lists marketplace entries', async () => {
    const getMarketplace = jest
      .fn()
      .mockResolvedValue([{ id: 'seo', installed: false }]);

    const module = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        { provide: PluginRegistryService, useValue: {} },
        { provide: PluginFilesService, useValue: {} },
        {
          provide: PluginMarketplaceService,
          useValue: { getMarketplace, install: jest.fn() },
        },
      ],
    }).compile();

    const controller = module.get(PluginController);
    await expect(controller.marketplaceList()).resolves.toEqual({
      message: 'Marketplace fetched successfully',
      data: [{ id: 'seo', installed: false }],
    });
    expect(getMarketplace).toHaveBeenCalledTimes(1);
  });

  it('installs a marketplace plugin by id', async () => {
    const install = jest.fn().mockResolvedValue([{ id: 'seo' }]);

    const module = await Test.createTestingModule({
      controllers: [PluginController],
      providers: [
        { provide: PluginRegistryService, useValue: {} },
        { provide: PluginFilesService, useValue: {} },
        {
          provide: PluginMarketplaceService,
          useValue: { getMarketplace: jest.fn(), install },
        },
      ],
    }).compile();

    const controller = module.get(PluginController);
    await expect(controller.marketplaceInstall({ id: 'seo' })).resolves.toEqual(
      {
        message: 'Plugin seo installed successfully',
        data: [{ id: 'seo' }],
      },
    );
    expect(install).toHaveBeenCalledWith('seo');
  });

  it('requires admin role for plugin lifecycle mutations only', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, PluginController.prototype.install),
    ).toEqual(['ADMIN']);
    expect(
      Reflect.getMetadata(ROLES_KEY, PluginController.prototype.rescan),
    ).toEqual(['ADMIN']);
    expect(
      Reflect.getMetadata(ROLES_KEY, PluginController.prototype.uninstall),
    ).toEqual(['ADMIN']);

    expect(
      Reflect.getMetadata(ROLES_KEY, PluginController.prototype.findAll),
    ).toBeUndefined();
  });
});
