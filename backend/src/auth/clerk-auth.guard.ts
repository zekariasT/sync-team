import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClerkClient } from '@clerk/clerk-sdk-node';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    const token = authHeader?.split(' ')[1];

    if (!authHeader || !authHeader.startsWith('Bearer ') || !token || token === 'null' || token === 'undefined') {
       if (process.env.DEMO_MODE === 'true') {
         // Public portfolio demo: tokenless visitors act as the seeded guest
         // MEMBER. Identity is hardcoded — x-user-id is never trusted (unlike
         // the old ALLOW_INSECURE_DEV_AUTH bypass, which impersonated any id).
         request['user'] = { clerkId: 'guest-demo-user' };
         return true;
       }
       throw new UnauthorizedException('Missing Authorization Header');
    }
    try {
      const claims = await this.clerkClient.verifyToken(token);
      request['user'] = { clerkId: claims.sub };
      return true;
    } catch (err) {
      console.error('Clerk Auth Error:', err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
