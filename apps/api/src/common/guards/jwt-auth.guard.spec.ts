import { ApiTokenService } from '@/features/api-token/api-token.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let apiTokenService: { validateToken: jest.Mock };

  const buildContext = (authorization?: string) => {
    const request: any = { headers: { authorization } };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => null,
      getClass: () => null,
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    apiTokenService = { validateToken: jest.fn() };
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const configService = {
      get: jest.fn().mockReturnValue('secret'),
    } as unknown as ConfigService;

    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      reflector,
      configService,
      apiTokenService as unknown as ApiTokenService,
    );
  });

  it('does not fall through to the api-token store for a JWT-shaped token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));
    const context = buildContext('Bearer aaa.bbb.ccc');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(apiTokenService.validateToken).not.toHaveBeenCalled();
  });

  it('validates an opaque (non-JWT) token against the api-token store', async () => {
    const opaque = 'a'.repeat(64);
    apiTokenService.validateToken.mockResolvedValue({ id: 'u1' });
    const context = buildContext(`Bearer ${opaque}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    expect(apiTokenService.validateToken).toHaveBeenCalledWith(opaque);
  });
});
