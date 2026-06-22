import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PluginEnabledGuard } from './plugin-enabled.guard';
import { PluginRegistryService } from './plugin-registry.service';

describe('PluginEnabledGuard', () => {
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;

  const build = (metaPluginId: string | undefined, enabled?: boolean) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(metaPluginId),
    } as unknown as Reflector;
    const registry = {
      get: jest
        .fn()
        .mockReturnValue(enabled === undefined ? undefined : { enabled }),
    } as unknown as PluginRegistryService;
    return new PluginEnabledGuard(reflector, registry);
  };

  it('allows routes without a plugin requirement', () => {
    expect(build(undefined).canActivate(context)).toBe(true);
  });

  it('allows a route whose plugin is enabled', () => {
    expect(build('media', true).canActivate(context)).toBe(true);
  });

  it('blocks a route whose plugin is disabled', () => {
    expect(() => build('media', false).canActivate(context)).toThrow(
      ForbiddenException,
    );
  });
});
