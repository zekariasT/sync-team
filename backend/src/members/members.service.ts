import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { AiService } from "../ai/ai.service.js";

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService, private aiService: AiService) {}

  async findAll(requesterId?: string) {
    if (!requesterId) {
      return await this.prisma.user.findMany({
        include: {
          teamMembers: {
            include: { team: true }
          },
        },
      }); 
    }

    // Auto-create guest user if missing
    if (requesterId === 'guest-demo-user') {
      await this.prisma.user.upsert({
        where: { id: 'guest-demo-user' },
        update: {},
        create: {
          id: 'guest-demo-user',
          name: 'Guest Demo User',
          email: 'guest@demo.com',
          status: 'Available'
        }
      });
    }

    // Get the requester's teams and their roles
    const requesterMemberships = await this.prisma.teamMember.findMany({
      where: { userId: requesterId },
      select: { teamId: true, role: true }
    });

    const requester = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { isRoot: true } });
    const isAdmin = !!requester?.isRoot || requesterMemberships.some(rm => rm.role === 'ADMIN');

    if (isAdmin) {
      // Admins see everyone!
      return await this.prisma.user.findMany({
        include: {
          teamMembers: {
            include: { team: true }
          },
        },
      });
    }

    const teamIds = requesterMemberships.map(rm => rm.teamId);

    // Get all users who share any of those teams OR are the user themselves
    return await this.prisma.user.findMany({
      where: {
        OR: [
          { id: requesterId },
          {
            teamMembers: {
              some: {
                teamId: { in: teamIds }
              }
            }
          }
        ]
      },
      include: {
        teamMembers: {
          include: { team: true }
        },
      },
    });
  }

  async update(id: string, status: string, requesterId?: string) {
    if (status) {
       const validation = await this.aiService.validateStatus(status);
       if (!validation.isAppropriate) {
          throw new BadRequestException(validation.reason || 'Inappropriate content detected in status pulse.');
       }
    }

    // Auto-create guest user if missing
    if (id === 'guest-demo-user') {
      await this.prisma.user.upsert({
        where: { id: 'guest-demo-user' },
        update: {},
        create: {
          id: 'guest-demo-user',
          name: 'Guest Demo User',
          email: 'guest@demo.com',
          status: 'Available'
        }
      });
    }
    if (requesterId && id !== requesterId) {
      // Check permissions: Is requester ADMIN in any team, or LEAD in a shared team?
      const requesterMemberships = await this.prisma.teamMember.findMany({
        where: { userId: requesterId },
      });
      const requester = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { isRoot: true } });
      const isAdmin = !!requester?.isRoot || requesterMemberships.some(rm => rm.role === 'ADMIN');

      let isPermitted = isAdmin;

      if (!isAdmin) {
        const leadTeamIds = requesterMemberships.filter(rm => rm.role === 'LEAD').map(rm => rm.teamId);
        if (leadTeamIds.length > 0) {
           const targetMemberships = await this.prisma.teamMember.findMany({
             where: { userId: id, teamId: { in: leadTeamIds } }
           });
           if (targetMemberships.length > 0) {
              isPermitted = true;
           }
        }
      }

      if (!isPermitted) {
         throw new ForbiddenException('You do not have permission to update this user\'s status');
      }
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: { status },
        include: {
          teamMembers: {
            include: { team: true }
          }
        }
      });
    } catch (error) {
       throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async syncUser(data: { id: string, email: string, name: string, avatar?: string | null }) {
    const user = await this.prisma.user.upsert({
      where: { id: data.id },
      update: {
        email: data.email,
        name: data.name,
        avatar: data.avatar || null,
      },
      create: {
        id: data.id,
        email: data.email,
        name: data.name,
        avatar: data.avatar || null,
        status: 'Available',
      },
    });

    // Auto-enroll removed: signing in now only upserts the user record, it no
    // longer grants membership/roles in the seeded demo teams. Previously every
    // login re-upserted the user as ADMIN of all demo teams, which silently
    // reverted any manual role/membership change on the next sign-in. Membership
    // is now managed explicitly via the team endpoints.
    return user;
  }

  async delete(id: string, requesterId: string) {
    if (!requesterId) throw new ForbiddenException('Unauthorized');
    // Deleting a user account is a destructive, system-wide action — reserved
    // for root (the platform operator), not ordinary team admins.
    const requester = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { isRoot: true } });
    if (!requester?.isRoot) throw new ForbiddenException('Only a root user can delete user accounts');
    // Root accounts are protected: they can never be deleted through the API —
    // not by another root, and not by themselves. This prevents an irreversible
    // lockout of the platform's superuser.
    const target = await this.prisma.user.findUnique({ where: { id }, select: { isRoot: true } });
    if (!target) throw new NotFoundException('User not found');
    if (target.isRoot) throw new ForbiddenException('Root accounts cannot be deleted.');
    return await this.prisma.user.delete({ where: { id } });
  }
}