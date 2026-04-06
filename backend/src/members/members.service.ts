import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll(requesterId?: string) {
    if (!requesterId) {
      return await this.prisma.user.findMany({
        include: {
          teamMembers: true,
        },
      }); 
    }

    // Get the requester's teams and their roles
    const requesterMemberships = await this.prisma.teamMember.findMany({
      where: { userId: requesterId },
      select: { teamId: true, role: true }
    });

    const isAdmin = requesterMemberships.some(rm => rm.role === 'ADMIN');

    if (isAdmin) {
      // Admins see everyone!
      return await this.prisma.user.findMany({
        include: {
          teamMembers: true,
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
        teamMembers: true,
      },
    });
  }

  async update(id: string, status: string, requesterId?: string) {
    if (requesterId && id !== requesterId) {
      // Check permissions: Is requester ADMIN in any team, or LEAD in a shared team?
      const requesterMemberships = await this.prisma.teamMember.findMany({
        where: { userId: requesterId },
      });
      const isAdmin = requesterMemberships.some(rm => rm.role === 'ADMIN');
      
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
        include: { teamMembers: true }
      });
    } catch (error) {
       throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async syncUser(data: { id: string, email: string, name: string, avatar?: string | null }) {
    return this.prisma.user.upsert({
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
  }
}