import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard.js';
import { TaskState } from '@prisma/client';

@Controller('tasks')
@UseGuards(ClerkAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('teams/:teamId/projects')
  getProjects(@Param('teamId') teamId: string) {
    return this.tasksService.getProjects(teamId);
  }

  @Post('teams/:teamId/projects')
  createProject(
    @Param('teamId') teamId: string,
    @Body() data: { name: string; description?: string }
  ) {
    return this.tasksService.createProject(teamId, data);
  }

  @Get('teams/:teamId/cycles')
  getCycles(@Param('teamId') teamId: string) {
    return this.tasksService.getCycles(teamId);
  }

  @Post('teams/:teamId/cycles')
  createCycle(
    @Param('teamId') teamId: string, 
    @Body() data: { name: string; startDate: string; endDate: string }
  ) {
    return this.tasksService.createCycle(teamId, data);
  }

  @Get('teams/:teamId/tasks')
  getTasks(@Param('teamId') teamId: string) {
    return this.tasksService.getTasks(teamId);
  }

  @Post('teams/:teamId/tasks')
  createTask(
    @Param('teamId') teamId: string,
    @Body('reporterId') reporterId: string,
    @Body() data: {
      title: string;
      description?: string;
      state?: TaskState;
      assigneeId?: string;
      projectId?: string;
      cycleId?: string;
    }
  ) {
    const { reporterId: _, ...taskData } = data as any; // remove reporterId from data spread if included
    return this.tasksService.createTask(teamId, reporterId, taskData);
  }

  @Patch(':id/state')
  updateTaskState(@Param('id') id: string, @Body('state') state: TaskState) {
    return this.tasksService.updateTaskState(id, state);
  }

  @Patch(':id/assignee')
  updateTaskAssignee(@Param('id') id: string, @Body('assigneeId') assigneeId: string | null) {
    return this.tasksService.updateTaskAssignee(id, assigneeId);
  }
}
