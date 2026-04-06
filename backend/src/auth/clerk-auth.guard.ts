import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClerkClient } from '@clerk/clerk-sdk-node';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
       // Check if there is an x-user-id fallback for dev/testing if needed, 
       // but for production, we strictly require the token.
       const requesterId = request.headers['x-user-id'];
       if (process.env.NODE_ENV !== 'production' && requesterId) {
         request['user'] = { clerkId: requesterId };
         return true;
       }
       throw new UnauthorizedException('Missing Authorization Header');
    }

    const token = authHeader.split(' ')[1];

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
