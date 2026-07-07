import { Controller, Get, Post, Body, Param, ForbiddenException, Delete, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { UserId } from '../auth/user-id.decorator.js';
import { CreateTeamDto, UpdateRoleDto, AddMemberDto } from '../dto/teams.dto.js';

@Controller('teams')
export class TeamsController {
    constructor(private readonly prisma: PrismaService) {}

    /** Global account-level superuser (User.isRoot), decoupled from teams. */
    private async isRoot(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }, select: { isRoot: true }
        });
        return !!user?.isRoot;
    }

    /** ADMIN membership in one specific team. */
    private async isTeamAdmin(userId: string, teamId: string): Promise<boolean> {
        const admin = await this.prisma.teamMember.findFirst({
            where: { userId, teamId, role: 'ADMIN' }
        });
        return !!admin;
    }

    // Root OR an ADMIN of any team — used for cross-team *read* visibility and
    // team creation. NOT for managing a specific team's membership/roles: those
    // must be scoped to the target team via isTeamAdmin (or root).
    private async isPrivileged(userId: string): Promise<boolean> {
        if (await this.isRoot(userId)) return true;
        const admin = await this.prisma.teamMember.findFirst({
            where: { userId, role: 'ADMIN' }
        });
        return !!admin;
    }

    @Get()
    async findAll(@UserId() requesterId?: string) {
        if (!requesterId) return [];

        if (await this.isPrivileged(requesterId)) {
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

        if (!(await this.isPrivileged(requesterId))) {
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
    async create(@Body() body: CreateTeamDto, @UserId() requesterId?: string) {
        if (!requesterId) throw new ForbiddenException('Unauthorized');

        if (!(await this.isPrivileged(requesterId))) throw new ForbiddenException('Only administrators can create teams');

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
        @Body() body: UpdateRoleDto,
        @UserId() requesterId: string
    ) {
        if (!requesterId) throw new ForbiddenException('Unauthorized');
        if (requesterId === 'guest-demo-user') throw new ForbiddenException('Action disabled in public demo');

        // Only the three team-scoped roles are assignable. Root is a global
        // account attribute (User.isRoot), never a team role granted here.
        const assignableRoles = ['ADMIN', 'LEAD', 'MEMBER'];
        if (!assignableRoles.includes(body.role)) {
            throw new ForbiddenException(`Role must be one of: ${assignableRoles.join(', ')}`);
        }

        const root = await this.isRoot(requesterId);
        // Role changes must be made by an ADMIN of *this* team (or root) — an
        // admin of some other team has no authority here.
        if (!root && !(await this.isTeamAdmin(requesterId, teamId))) {
            throw new ForbiddenException('Only administrators of this team can change roles');
        }
        // Granting the ADMIN role is reserved for root: a team admin must not be
        // able to promote anyone (including themselves) to ADMIN.
        if (body.role === 'ADMIN' && !root) {
            throw new ForbiddenException('Only a root user can grant the ADMIN role');
        }

        const target = await this.prisma.teamMember.findUnique({
            where: { userId_teamId: { userId, teamId } },
            include: { user: { select: { isRoot: true } } }
        });
        if (!target) throw new NotFoundException('Membership not found');
        // A root user's membership can only be altered by another root.
        if (target.user?.isRoot && !root) {
            throw new ForbiddenException("Only a root user can change a root user's role");
        }
        // Revoking/altering an existing ADMIN's role is root-only too — the
        // whole ADMIN role (grant and revoke) is controlled by root.
        if (target.role === 'ADMIN' && !root) {
            throw new ForbiddenException("Only a root user can change an ADMIN's role");
        }

        return this.prisma.teamMember.update({
            where: { userId_teamId: { userId, teamId } },
            data: { role: body.role as any }
        });
    }

    @Post(':teamId/members')
    async addMember(
        @Param('teamId') teamId: string,
        @Body() body: AddMemberDto,
        @UserId() requesterId: string
    ) {
        if (!requesterId) throw new ForbiddenException('Unauthorized');

        // Only team-scoped roles are assignable (root is account-level).
        const assignableRoles = ['ADMIN', 'LEAD', 'MEMBER'];
        if (body.role && !assignableRoles.includes(body.role)) {
            throw new ForbiddenException(`Role must be one of: ${assignableRoles.join(', ')}`);
        }

        const root = await this.isRoot(requesterId);
        if (!root && !(await this.isTeamAdmin(requesterId, teamId))) {
            throw new ForbiddenException('Only administrators of this team can add members');
        }
        // Adding someone directly as ADMIN is reserved for root.
        if (body.role === 'ADMIN' && !root) {
            throw new ForbiddenException('Only a root user can grant the ADMIN role');
        }

        const user = await this.prisma.user.findUnique({
            where: { email: body.email }
        });
        if (!user) throw new NotFoundException('User with this email not found');

        // A root user's membership can only be altered by another root.
        if (user.isRoot && !root) {
            throw new ForbiddenException("Only a root user can change a root user's membership");
        }
        // Closing the loophole: re-adding an existing ADMIN would otherwise
        // demote them via the upsert's update branch — altering an ADMIN is
        // root-only.
        const existing = await this.prisma.teamMember.findUnique({
            where: { userId_teamId: { userId: user.id, teamId } }
        });
        if (existing?.role === 'ADMIN' && !root) {
            throw new ForbiddenException("Only a root user can change an ADMIN's role");
        }

        // Idempotent: if they're already on the team, update the role instead of
        // failing on the unique constraint.
        return this.prisma.teamMember.upsert({
            where: { userId_teamId: { userId: user.id, teamId } },
            update: { role: (body.role as any) || 'MEMBER' },
            create: {
                userId: user.id,
                teamId,
                role: (body.role as any) || 'MEMBER'
            }
        });
    }

    @Delete(':teamId/members/:userId')
    async removeMember(
        @Param('teamId') teamId: string,
        @Param('userId') userId: string,
        @UserId() requesterId: string
    ) {
        if (!requesterId) throw new ForbiddenException('Unauthorized');
        if (requesterId === 'guest-demo-user') throw new ForbiddenException('Action disabled in public demo');

        // Members may remove themselves (leave a team); removing anyone else
        // requires being an ADMIN of *this* team (or root).
        const root = await this.isRoot(requesterId);
        const isSelf = requesterId === userId;
        const allowed = isSelf || root || await this.isTeamAdmin(requesterId, teamId);
        if (!allowed) {
            throw new ForbiddenException('Only administrators of this team can remove other members');
        }

        const target = await this.prisma.teamMember.findUnique({
            where: { userId_teamId: { userId, teamId } },
            include: { user: { select: { isRoot: true } } }
        });
        // A root user (global superuser) can only be removed by another root —
        // a team admin must never be able to evict the platform operator.
        if (target?.user?.isRoot && !root) {
            throw new ForbiddenException('Only a root user can remove a root user');
        }
        // Removing another user who is an ADMIN revokes their admin — root-only.
        if (target?.role === 'ADMIN' && !root && !isSelf) {
            throw new ForbiddenException('Only a root user can remove an ADMIN');
        }

        return this.prisma.teamMember.delete({
            where: { userId_teamId: { userId, teamId } }
        });
    }
}
