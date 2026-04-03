import { Module, Global } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';
import { MembersController } from './members/members.controller.js';
import { MembersService } from './members/members.service.js';
import { PulseGateway } from './pulse/pulse.gateway.js';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from './auth/clerk-auth.guard.js';
import { RolesGuard } from './auth/roles.guard.js';
import { ChatModule } from './chat/chat.module.js';
import { TeamsController } from './teams/teams.controller.js';
import { AiModule } from './ai/ai.module.js';
import { VideoModule } from './video/video.module.js';
import { TasksModule } from './tasks/tasks.module.js';

@Global()
@Module({
  imports: [ChatModule, AiModule, VideoModule, TasksModule],
  controllers: [AppController, MembersController, TeamsController],
  providers: [
    AppService, 
    MembersService, 
    PrismaService, 
    PulseGateway,
    {
      provide: APP_GUARD,
      useClass: ClerkAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }
  ],
  exports: [PrismaService],
})
export class AppModule {}
