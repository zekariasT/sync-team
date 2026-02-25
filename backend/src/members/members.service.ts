import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

async findAll() {
  return await this.prisma.member.findMany(); 
}
}