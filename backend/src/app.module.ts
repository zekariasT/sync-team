import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { MembersController } from './members/members.controller.js';
import { MembersService } from './members/members.service.js';
import { PulseGateway } from './pulse/pulse.gateway.js';

@Module({
  imports: [],
  controllers: [AppController, MembersController],
  providers: [AppService, MembersService, PrismaService, PulseGateway],
})
export class AppModule {}
