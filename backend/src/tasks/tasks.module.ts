import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { TasksController } from './tasks.controller.js';

@Module({
  providers: [TasksService],
  controllers: [TasksController]
})
export class TasksModule {}
