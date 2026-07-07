import { Controller, Post, Param } from '@nestjs/common';
import { AiService } from './ai.service.js';
import { UserId } from '../auth/user-id.decorator.js';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('teams/:teamId/summarize')
  async summarizeTeam(@Param('teamId') teamId: string, @UserId() requesterId?: string) {
    return this.aiService.summarizeTeam(teamId, requesterId);
  }
}
