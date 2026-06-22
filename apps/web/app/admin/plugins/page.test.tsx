import Page from '@/app/admin/plugins/page';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPluginsMock = vi.fn();
const installPluginMock = vi.fn();
const rescanPluginsMock = vi.fn();
const uninstallPluginMock = vi.fn();
const togglePluginMock = vi.fn();

vi.mock('@/lib/plugin/icons', () => ({
  getIcon: () => <span>icon</span>,
}));

vi.mock('@/server/plugin.server', () => ({
  getPlugins: (...args: unknown[]) => getPluginsMock(...args),
  installPlugin: (...args: unknown[]) => installPluginMock(...args),
  rescanPlugins: (...args: unknown[]) => rescanPluginsMock(...args),
  uninstallPlugin: (...args: unknown[]) => uninstallPluginMock(...args),
  togglePlugin: (...args: unknown[]) => togglePluginMock(...args),
}));

vi.mock('@repo/shadcn/sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('admin plugins page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reflects plugin.enabled in the per-plugin toggle switch', async () => {
    getPluginsMock.mockResolvedValue([
      {
        id: 'core-disabled',
        name: 'Core Disabled',
        description: 'desc',
        version: '1.0.0',
        icon: 'box',
        source: 'core',
        isSystem: true,
        enabled: false,
        navItems: [],
      },
      {
        id: 'user-enabled',
        name: 'User Enabled',
        description: 'desc',
        version: '1.0.0',
        icon: 'box',
        source: 'user',
        isSystem: false,
        enabled: true,
        navItems: [],
      },
    ]);

    render(<Page />);

    const coreTitle = await screen.findByText('Core Disabled');
    const userTitle = await screen.findByText('User Enabled');

    const coreCard = coreTitle.closest('[data-slot="card"]');
    const userCard = userTitle.closest('[data-slot="card"]');

    expect(coreCard).not.toBeNull();
    expect(userCard).not.toBeNull();
    expect(
      within(coreCard as HTMLElement)
        .getByRole('switch')
        .getAttribute('aria-checked'),
    ).toBe('false');
    expect(
      within(userCard as HTMLElement)
        .getByRole('switch')
        .getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('prevents starting a second delete while one is in flight', async () => {
    const initialPlugins = [
      {
        id: 'user-a',
        name: 'Plugin A',
        description: 'desc',
        version: '1.0.0',
        icon: 'box',
        source: 'user',
        isSystem: false,
        enabled: true,
        navItems: [],
      },
      {
        id: 'user-b',
        name: 'Plugin B',
        description: 'desc',
        version: '1.0.0',
        icon: 'box',
        source: 'user',
        isSystem: false,
        enabled: true,
        navItems: [],
      },
    ];

    getPluginsMock.mockResolvedValue(initialPlugins);

    let resolveDelete: ((value: unknown) => void) | null = null;
    uninstallPluginMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve;
        }),
    );

    render(<Page />);

    await screen.findByText('Plugin A');

    const pluginATitle = screen.getByText('Plugin A');
    const pluginBTitle = screen.getByText('Plugin B');
    const pluginACard = pluginATitle.closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    const pluginBCard = pluginBTitle.closest(
      '[data-slot="card"]',
    ) as HTMLElement;

    fireEvent.click(
      within(pluginACard).getByRole('button', { name: 'Delete' }),
    );

    await waitFor(() => {
      expect(uninstallPluginMock).toHaveBeenCalledTimes(1);
    });

    const secondDeleteButton = within(pluginBCard).getByRole('button', {
      name: 'Delete',
    });

    await waitFor(() => {
      expect(secondDeleteButton.hasAttribute('disabled')).toBe(true);
    });

    fireEvent.click(secondDeleteButton);

    expect(uninstallPluginMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDelete?.([]);
    });
  });

  it('shows plugin folder hint with easy-to-find paths', async () => {
    getPluginsMock.mockResolvedValue([]);

    render(<Page />);

    await screen.findByText(/Plugin folders are here:/i);
    expect(screen.getByText('core/plugins')).toBeDefined();
    expect(screen.getByText('plugins')).toBeDefined();
  });
});
