import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClerkClient } from '@clerk/clerk-sdk-node';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true; // Allow public routes if not protected by @UseGuards at class/method level or if middleware handled it
    }

    const token = authHeader.split(' ')[1];

    try {
      const claims = await this.clerkClient.verifyToken(token);
      request['user'] = { clerkId: claims.sub };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
