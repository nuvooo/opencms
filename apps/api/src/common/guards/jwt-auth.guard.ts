import { IS_PUBLIC_KEY } from '@/common/decorators';
import { Env } from '@/common/utils';
import { ApiTokenService } from '@/features/api-token/api-token.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService<Env>,
    private apiTokenService: ApiTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = this.getRequest(context);
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    // A JWT has three dot-separated segments; anything else is treated as an
    // opaque API token. Discriminating by shape keeps malformed/expired JWTs out
    // of the api-token lookup path.
    const isJwt = token.split('.').length === 3;
    const user = isJwt
      ? await this.verifyJwt(token)
      : await this.apiTokenService.validateToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid Access Token');
    }

    request.user = user;
    return true;
  }

  private async verifyJwt(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('ACCESS_TOKEN_SECRET'),
      });
    } catch {
      return null;
    }
  }

  // Global guards run for HTTP and GraphQL resolvers alike, but the request
  // lives in different places. Extract it from whichever context applies so the
  // guard actually protects GraphQL operations instead of reading `undefined`.
  private getRequest(context: ExecutionContext): Request & { user?: unknown } {
    if (context.getType<'http' | 'graphql'>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext().req;
    }
    return context.switchToHttp().getRequest();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
