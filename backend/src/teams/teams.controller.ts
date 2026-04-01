import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Controller('teams')
export class TeamsController {
    constructor(private readonly prisma: PrismaService) {}

    @Get()
    async findAll() {
        return this.prisma.team.findMany({
            include: { members: true, channels: true },
        });
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.prisma.team.findUnique({
            where: { id },
            include: { members: { include: { user: true } }, channels: true },
        });
    }

    @Post()
    async create(@Body() body: { name: string, description?: string }) {
        return this.prisma.team.create({
            data: {
                name: body.name,
                description: body.description,
            },
        });
    }
}
