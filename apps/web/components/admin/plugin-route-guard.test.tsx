import PluginRouteGuard from '@/components/admin/plugin-route-guard';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { replaceMock, pathnameMock, pluginsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pathnameMock: vi.fn<() => string>(),
  pluginsMock: vi.fn<() => unknown[]>(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => pathnameMock(),
}));

vi.mock('@/lib/plugin/registry', () => ({
  usePluginRegistry: () => ({ plugins: pluginsMock() }),
}));

const plugin = (id: string, path: string, enabled: boolean) => ({
  id,
  name: id,
  description: '',
  version: '1.0.0',
  icon: 'box',
  source: 'core' as const,
  isSystem: true,
  enabled,
  navItems: [{ path, label: id, icon: 'box' }],
});

describe('PluginRouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the route when its owning plugin is enabled', () => {
    pluginsMock.mockReturnValue([plugin('tenants', '/admin/tenants', true)]);
    pathnameMock.mockReturnValue('/admin/tenants');

    render(
      <PluginRouteGuard>
        <div>tenant content</div>
      </PluginRouteGuard>,
    );

    expect(screen.getByText('tenant content')).toBeDefined();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('blocks and redirects when the owning plugin is disabled', async () => {
    pluginsMock.mockReturnValue([plugin('tenants', '/admin/tenants', false)]);
    pathnameMock.mockReturnValue('/admin/tenants/create');

    render(
      <PluginRouteGuard>
        <div>tenant content</div>
      </PluginRouteGuard>,
    );

    expect(screen.queryByText('tenant content')).toBeNull();
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/admin');
    });
  });

  it('resolves the longest matching nav path (nested route wins)', () => {
    pluginsMock.mockReturnValue([
      plugin('dashboard', '/admin', true),
      plugin('tenants', '/admin/tenants', false),
    ]);
    pathnameMock.mockReturnValue('/admin/tenants');

    render(
      <PluginRouteGuard>
        <div>tenant content</div>
      </PluginRouteGuard>,
    );

    // `/admin/tenants` (disabled) must win over `/admin` (enabled dashboard).
    expect(screen.queryByText('tenant content')).toBeNull();
    expect(replaceMock).toHaveBeenCalledWith('/admin');
  });

  it('renders routes that belong to no plugin', () => {
    pluginsMock.mockReturnValue([plugin('tenants', '/admin/tenants', false)]);
    pathnameMock.mockReturnValue('/admin/profile');

    render(
      <PluginRouteGuard>
        <div>profile content</div>
      </PluginRouteGuard>,
    );

    expect(screen.getByText('profile content')).toBeDefined();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
