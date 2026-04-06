import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Prioritize populated user from ClerkAuthGuard, then fallback to header in dev
    return request['user']?.clerkId || request.headers['x-user-id'];
  },
);
