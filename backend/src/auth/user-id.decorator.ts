import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Always use the identity the ClerkAuthGuard verified and populated.
    // Never fall back to the raw x-user-id header — it is client-controlled
    // and trusting it for authorization allows cross-tenant impersonation.
    return request['user']?.clerkId;
  },
);
