import { Controller, Get, Post, Body } from "@nestjs/common";
import { MembersService } from "./members.service.js";
import { Member } from "./member.interface.js";

@Controller('members')
export class MembersController {
    constructor(private readonly membersService: MembersService) {}

    @Get()
    async findAll(): Promise<Member[]> {
        return this.membersService.findAll();
    }

    // @Post()
    // async create(@Body() memberData: any): Promise<Member> {
    //     return await this.membersService.create(memberData);
    // }

}