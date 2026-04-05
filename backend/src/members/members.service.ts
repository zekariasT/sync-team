import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.user.findMany({
      include: {
        teamMembers: true,
      },
    }); 
  }

  async update(id: string, status: string) {
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