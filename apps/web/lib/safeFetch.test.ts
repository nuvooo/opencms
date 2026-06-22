import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { safeFetch } from './safeFetch';

// Avoid pulling in the real T3 env validation (requires runtime env vars).
vi.mock('./env', () => ({ env: { API_URL: 'http://api.test' } }));

const schema = z.object({ ok: z.boolean() });

describe('safeFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an error tuple instead of throwing when fetch rejects (API unreachable)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('fetch failed')),
    );

    const [error, data] = await safeFetch(schema, '/auth/session/x');

    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });

  it('returns the API error message when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ message: 'Unauthorized' }),
      }),
    );

    const [error, data] = await safeFetch(schema, '/auth/session/x');

    expect(error).toBe('Unauthorized');
    expect(data).toBeNull();
  });

  it('returns the validated data on a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    );

    const [error, data] = await safeFetch(schema, '/auth/session/x');

    expect(error).toBeNull();
    expect(data).toEqual({ ok: true });
  });
});

describe('plugin schema contract', () => {
  it('accepts plugin source metadata', async () => {
    const { PluginDescriptorSchema } = await import('@/server/plugin.schema');
    const parsed = PluginDescriptorSchema.parse({
      id: 'dashboard',
      name: 'Dashboard',
      description: 'CMS overview and statistics.',
      version: '1.0.0',
      icon: 'LayoutDashboard',
      source: 'core',
      isSystem: true,
      enabled: true,
      navItems: [],
    });
    expect(parsed.source).toBe('core');
  });
});
