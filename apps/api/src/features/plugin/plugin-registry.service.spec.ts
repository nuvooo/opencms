import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PluginState } from './entities/plugin-state.entity';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginRegistryService } from './plugin-registry.service';

describe('PluginRegistryService', () => {
  const loaderStub = {
    loadAll: jest.fn(),
  } as unknown as PluginLoaderService;

  const stateRepo = {
    find: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<Pick<Repository<PluginState>, 'find' | 'save'>>;

  const descriptor = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    name: id,
    description: 'Core',
    version: '1.0.0',
    icon: 'LayoutDashboard',
    navItems: [],
    source: 'core' as const,
    isSystem: true,
    enabled: true,
    ...extra,
  });

  const makeRegistry = async () => {
    const registry = new PluginRegistryService(
      loaderStub,
      stateRepo as unknown as Repository<PluginState>,
    );
    await registry.onModuleInit();
    return registry;
  };

  beforeEach(() => {
    (loaderStub.loadAll as jest.Mock).mockReset();
    stateRepo.find.mockReset().mockResolvedValue([]);
    stateRepo.save.mockReset().mockResolvedValue({} as never);
  });

  it('hydrates plugins from loader on bootstrap', async () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([
      descriptor('dashboard'),
    ]);

    const registry = await makeRegistry();

    expect(registry.getAll()).toHaveLength(1);
    expect(registry.get('dashboard')?.isSystem).toBe(true);
  });

  it('applies the persisted disabled state when rescanning', async () => {
    // `tenants` is an optional core feature, so it stays toggleable.
    (loaderStub.loadAll as jest.Mock).mockReturnValue([descriptor('tenants')]);
    stateRepo.find.mockResolvedValue([
      { pluginId: 'tenants', enabled: false } as PluginState,
    ]);

    const registry = await makeRegistry();

    expect(registry.get('tenants')?.enabled).toBe(false);
  });

  it('persists and reflects an enable/disable toggle', async () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([descriptor('tenants')]);
    const registry = await makeRegistry();

    await registry.setEnabled('tenants', false);

    expect(stateRepo.save).toHaveBeenCalledWith({
      pluginId: 'tenants',
      enabled: false,
    });
    expect(registry.get('tenants')?.enabled).toBe(false);
  });

  it('marks core features as protected and forces them enabled', async () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([
      descriptor('media'),
      descriptor('tenants'),
    ]);
    // Even a stale "disabled" state must not turn a protected plugin off.
    stateRepo.find.mockResolvedValue([
      { pluginId: 'media', enabled: false } as PluginState,
    ]);

    const registry = await makeRegistry();

    expect(registry.get('media')?.protected).toBe(true);
    expect(registry.get('media')?.enabled).toBe(true);
    expect(registry.get('tenants')?.protected).toBe(false);
  });

  it('refuses to disable a protected core feature', async () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([descriptor('media')]);
    const registry = await makeRegistry();

    await expect(registry.setEnabled('media', false)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(stateRepo.save).not.toHaveBeenCalled();
  });

  it('rejects delete for core plugins', async () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([
      descriptor('dashboard'),
    ]);
    const registry = await makeRegistry();

    expect(() => registry.assertRemovable('dashboard')).toThrow(
      ForbiddenException,
    );
  });

  it('throws for unknown plugin id on delete precheck', async () => {
    (loaderStub.loadAll as jest.Mock).mockReturnValue([]);
    const registry = await makeRegistry();

    expect(() => registry.assertRemovable('missing')).toThrow(
      BadRequestException,
    );
  });
});
