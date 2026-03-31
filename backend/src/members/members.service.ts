import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return await this.prisma.member.findMany(); 
  }

  async update(id: number, status: string) {
    try {
      return await this.prisma.member.update({
        where: { id },
        data: { status }
      });
    } catch (error) {
       throw new NotFoundException(`Member with ID ${id} not found`);
    }
  }
}