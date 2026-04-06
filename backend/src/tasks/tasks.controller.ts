import { Controller, Get, Post, Patch, Body, Param, UseGuards, Headers } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { TaskState } from '@prisma/client';

// Removing ClerkAuthGuard temporarily since frontend passes x-user-id instead
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('teams/:teamId/projects')
  getProjects(@Param('teamId') teamId: string, @Headers('x-user-id') requesterId: string) {
    return this.tasksService.getProjects(teamId, requesterId);
  }

  @Post('teams/:teamId/projects')
  createProject(
    @Param('teamId') teamId: string,
    @Body() data: { name: string; description?: string },
    @Headers('x-user-id') requesterId: string
  ) {
    return this.tasksService.createProject(teamId, data, requesterId);
  }

  @Get('teams/:teamId/cycles')
  getCycles(@Param('teamId') teamId: string, @Headers('x-user-id') requesterId: string) {
    return this.tasksService.getCycles(teamId, requesterId);
  }

  @Post('teams/:teamId/cycles')
  createCycle(
    @Param('teamId') teamId: string, 
    @Body() data: { name: string; startDate: string; endDate: string },
    @Headers('x-user-id') requesterId: string
  ) {
    return this.tasksService.createCycle(teamId, data, requesterId);
  }

  @Get('teams/:teamId/tasks')
  getTasks(@Param('teamId') teamId: string, @Headers('x-user-id') requesterId: string) {
    return this.tasksService.getTasks(teamId, requesterId);
  }

  @Post('teams/:teamId/tasks')
  createTask(
    @Param('teamId') teamId: string,
    @Body() data: {
      title: string;
      description?: string;
      state?: TaskState;
      assigneeId?: string;
      projectId?: string;
      cycleId?: string;
      reporterId?: string;
    },
    @Headers('x-user-id') requesterId: string
  ) {
    const { reporterId, ...taskData } = data as any; 
    return this.tasksService.createTask(teamId, reporterId || requesterId, taskData, requesterId);
  }

  @Patch(':id/state')
  updateTaskState(
    @Param('id') id: string, 
    @Body('state') state: TaskState,
    @Headers('x-user-id') requesterId: string
  ) {
    return this.tasksService.updateTaskState(id, state, requesterId);
  }

  @Patch(':id/assignee')
  updateTaskAssignee(
    @Param('id') id: string, 
    @Body('assigneeId') assigneeId: string | null,
    @Headers('x-user-id') requesterId: string
  ) {
    return this.tasksService.updateTaskAssignee(id, assigneeId, requesterId);
  }

  @Patch(':id')
  updateTask(
    @Param('id') id: string,
    @Body() data: any,
    @Headers('x-user-id') requesterId: string
  ) {
    return this.tasksService.updateTask(id, data, requesterId);
  }
}
