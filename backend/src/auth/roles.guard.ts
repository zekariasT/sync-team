import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma.service.js';
import { Role } from '@prisma/client';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request['user'];
    const clerkId = user?.clerkId;
    const teamId = request.params.teamId || request.body.teamId;

    if (!clerkId || !teamId) {
      return false;
    }

    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        userId: clerkId,
        teamId: teamId
      }
    });

    if (!teamMember || !roles.includes(teamMember.role)) {
      throw new ForbiddenException(`Insufficient permissions for role: ${teamMember?.role || 'NONE'}`);
    }

    return true;
  }
}
