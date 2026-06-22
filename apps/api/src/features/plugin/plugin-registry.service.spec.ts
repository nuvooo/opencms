import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginRegistryService } from './plugin-registry.service';

describe('PluginRegistryService', () => {
  const loaderStub = {
    loadAll: jest.fn(),
  } as unknown as PluginLoaderService;

  beforeEach(() => {
    (loaderStub.loadAll as jest.Mock).mockReset();
  });

  it('hydrates plugins from loader on bootstrap', () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([
      {
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Core',
        version: '1.0.0',
        icon: 'LayoutDashboard',
        navItems: [],
        source: 'core',
        isSystem: true,
        enabled: true,
      },
    ]);

    const registry = new PluginRegistryService(loaderStub);
    registry.onModuleInit();

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.get('dashboard')?.isSystem).toBe(true);
  });

  it('rejects delete for core plugins', () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([
      {
        id: 'dashboard',
        name: 'Dashboard',
        description: 'Core',
        version: '1.0.0',
        icon: 'LayoutDashboard',
        navItems: [],
        source: 'core',
        isSystem: true,
        enabled: true,
      },
    ]);

    const registry = new PluginRegistryService(loaderStub);
    registry.onModuleInit();

    expect(() => registry.assertRemovable('dashboard')).toThrow(
      ForbiddenException,
    );
  });

  it('throws for unknown plugin id on delete precheck', () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([]);
    const registry = new PluginRegistryService(loaderStub);
    registry.onModuleInit();

    expect(() => registry.assertRemovable('missing')).toThrow(
      BadRequestException,
    );
  });
});
