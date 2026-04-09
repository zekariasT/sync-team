import { Module, Global } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { KbModule } from './kb/kb.module.js';

@Global()
@Module({
  imports: [
    // Rate limiting: 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
    }),
    ChatModule,
    AiModule,
    VideoModule,
    TasksModule,
    KbModule,
  ],
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
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
