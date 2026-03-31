import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { MembersService } from './members.service.js';
import { PulseGateway } from '../pulse/pulse.gateway.js';
import { Member } from "./member.interface.js";

@Controller('members')
export class MembersController {
    constructor(
        private readonly membersService: MembersService,
        private readonly pulseGateway: PulseGateway
    ) { }

    @Get()
    async findAll(): Promise<Member[]> {
        return this.membersService.findAll();
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() body: { status: string }) {
        const updatedMember = await this.membersService.update(+id, body.status);

        this.pulseGateway.server.emit('statusChanged', {
            memberId: updatedMember.id,
            status: updatedMember.status
        });

        return updatedMember;
    }
}