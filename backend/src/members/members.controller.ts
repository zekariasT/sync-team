import { Controller, Get, Patch, Post, Body, Param, Delete, ForbiddenException } from '@nestjs/common';
import { MembersService } from './members.service.js';
import { PulseGateway } from '../pulse/pulse.gateway.js';
import { Member } from "./member.interface.js";
import { UserId } from '../auth/user-id.decorator.js';

@Controller('members')
export class MembersController {
    constructor(
        private readonly membersService: MembersService,
        private readonly pulseGateway: PulseGateway
    ) { }

    @Get()
    async findAll(@UserId() requesterId?: string): Promise<Member[]> {
        return this.membersService.findAll(requesterId);
    }

    @Post('sync')
    async syncUser(@Body() body: { id: string, email: string, name: string, avatar?: string | null }) {
        return this.membersService.syncUser(body);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string, 
        @Body() body: { status: string },
        @UserId() requesterId?: string
    ) {
        const updatedMember = await this.membersService.update(id, body.status, requesterId);

        // Broadcast to all teams this user belongs to
        updatedMember.teamMembers?.forEach((tm: any) => {
            this.pulseGateway.server.to(`team:${tm.teamId}`).emit('statusChanged', {
                userId: updatedMember.id,
                status: updatedMember.status,
                teamId: tm.teamId
            });
        });

        return updatedMember;
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @UserId() requesterId: string) {
        if (!requesterId) throw new ForbiddenException('Unauthorized');
        return this.membersService.delete(id, requesterId);
    }
}