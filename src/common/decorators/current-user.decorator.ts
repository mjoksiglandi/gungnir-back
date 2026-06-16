import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  sub: string;
  email: string;
  roles: string[];
  permissions?: string[];
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser | null => {
  const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
  return request.user ?? null;
});
