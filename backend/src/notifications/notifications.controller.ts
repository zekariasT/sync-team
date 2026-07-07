import { Controller, Get, Post, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { UserId } from '../auth/user-id.decorator.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@UserId() requesterId: string) {
    return this.notificationsService.list(requesterId);
  }

  @Post('read-all')
  async markAllRead(@UserId() requesterId: string) {
    return this.notificationsService.markAllRead(requesterId);
  }

  @Post(':id/read')
  async markRead(@Param('id') id: string, @UserId() requesterId: string) {
    return this.notificationsService.markRead(id, requesterId);
  }
}
