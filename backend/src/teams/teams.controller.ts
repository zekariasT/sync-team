import { Controller, Get, Post, Body, Param, ForbiddenException, Delete, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { UserId } from '../auth/user-id.decorator.js';

@Controller('teams')
export class TeamsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async findAll(@UserId() requesterId?: string) {
        if (!requesterId) return [];

        const adminMembership = await this.prisma.teamMember.findFirst({
            where: { userId: requesterId, role: 'ADMIN' }
        });

        if (adminMembership) {
            return this.prisma.team.findMany({
                include: { members: true, channels: true },
            });
        }

        return this.prisma.team.findMany({
            where: {
                members: {
                    some: { userId: requesterId }
                }
            },
            include: { members: true, channels: true },
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @UserId() requesterId?: string) {
        if (!requesterId) throw new ForbiddenException('Unauthorized');

        const adminMembership = await this.prisma.teamMember.findFirst({
            where: { userId: requesterId, role: 'ADMIN' }
        });

        if (!adminMembership) {
            const member = await this.prisma.teamMember.findUnique({
                where: { userId_teamId: { userId: requesterId, teamId: id } }
            });
            if (!member) throw new ForbiddenException('You do not belong to this team');
        }

        return this.prisma.team.findUnique({
            where: { id },
            include: { members: { include: { user: true } }, channels: true },
        });
    }

    @Post()
    async create(@Body() body: { name: string, description?: string }, @UserId() requesterId?: string) {
        // Only Admins can create teams in this MVP? Or anybody?
        // Let's assume only Admins for now to be safe.
        if (!requesterId) throw new ForbiddenException('Unauthorized');
        
        const adminMembership = await this.prisma.teamMember.findFirst({
            where: { userId: requesterId, role: 'ADMIN' }
        });

        if (!adminMembership) throw new ForbiddenException('Only administrators can create teams');

        return this.prisma.team.create({
            data: {
                name: body.name,
                description: body.description,
            },
        });
    }

    @Post(':teamId/members/:userId/role')
    async updateRole(
        @Param('teamId') teamId: string,
        @Param('userId') userId: string,
        @Body() body: { role: string },
        @UserId() requesterId: string
    ) {
        if (!requesterId) throw new ForbiddenException('Unauthorized');

        // Check if requester is ADMIN
        const adminMembership = await this.prisma.teamMember.findFirst({
            where: { userId: requesterId, role: 'ADMIN' }
        });

        if (!adminMembership) throw new ForbiddenException('Only administrators can change roles');

        // Update role
        return this.prisma.teamMember.update({
            where: { userId_teamId: { userId, teamId } },
            data: { role: body.role as any }
        });
    }

    // Create: Add user to team
    @Post(':teamId/members')
    async addMember(
        @Param('teamId') teamId: string,
        @Body() body: { email: string, role?: string },
        @UserId() requesterId: string
    ) {
        if (!requesterId) throw new ForbiddenException('Unauthorized');

        const adminMembership = await this.prisma.teamMember.findFirst({
            where: { userId: requesterId, role: 'ADMIN' }
        });
        if (!adminMembership) throw new ForbiddenException('Only administrators can add members');

        const user = await this.prisma.user.findUnique({
            where: { email: body.email }
        });
        if (!user) throw new NotFoundException('User with this email not found');

        return this.prisma.teamMember.create({
            data: {
                userId: user.id,
                teamId,
                role: (body.role as any) || 'MEMBER'
            }
        });
    }

    // Delete: Remove user from team
    @Delete(':teamId/members/:userId')
    async removeMember(
        @Param('teamId') teamId: string,
        @Param('userId') userId: string,
        @UserId() requesterId: string
    ) {
        if (!requesterId) throw new ForbiddenException('Unauthorized');

        const adminMembership = await this.prisma.teamMember.findFirst({
            where: { userId: requesterId, role: 'ADMIN' }
        });

        if (!adminMembership && requesterId !== userId) {
            throw new ForbiddenException('Only administrators can remove other members');
        }

        return this.prisma.teamMember.delete({
            where: { userId_teamId: { userId, teamId } }
        });
    }
}
