import {
  createParamDecorator,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';

export const TenantId = createParamDecorator(
  async (_: unknown, ctx: ExecutionContext): Promise<string> => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) throw new NotFoundException('x-tenant-id header required');
    return tenantId;
  },
);
