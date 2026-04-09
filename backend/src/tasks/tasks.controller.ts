import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service.js';
import { UserId } from '../auth/user-id.decorator.js';
import { CreateTaskDto } from '../dto/create-task.dto.js';
import { CreateProjectDto } from '../dto/create-project.dto.js';
import { CreateCycleDto } from '../dto/create-cycle.dto.js';
import { UpdateTaskDto, UpdateTaskStateDto, UpdateTaskAssigneeDto } from '../dto/update-task.dto.js';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('teams/:teamId/projects')
  getProjects(@Param('teamId') teamId: string, @UserId() requesterId: string) {
    return this.tasksService.getProjects(teamId, requesterId);
  }

  @Post('teams/:teamId/projects')
  createProject(
    @Param('teamId') teamId: string,
    @Body() data: CreateProjectDto,
    @UserId() requesterId: string
  ) {
    return this.tasksService.createProject(teamId, data, requesterId);
  }

  @Get('teams/:teamId/cycles')
  getCycles(@Param('teamId') teamId: string, @UserId() requesterId: string) {
    return this.tasksService.getCycles(teamId, requesterId);
  }

  @Post('teams/:teamId/cycles')
  createCycle(
    @Param('teamId') teamId: string, 
    @Body() data: CreateCycleDto,
    @UserId() requesterId: string
  ) {
    return this.tasksService.createCycle(teamId, data, requesterId);
  }

  @Get('teams/:teamId/tasks')
  getTasks(@Param('teamId') teamId: string, @UserId() requesterId: string) {
    return this.tasksService.getTasks(teamId, requesterId);
  }

  @Post('teams/:teamId/tasks')
  createTask(
    @Param('teamId') teamId: string,
    @Body() data: CreateTaskDto,
    @UserId() requesterId: string
  ) {
    const { reporterId, ...taskData } = data as any; 
    return this.tasksService.createTask(teamId, reporterId || requesterId, taskData, requesterId);
  }

  @Patch(':id/state')
  updateTaskState(
    @Param('id') id: string, 
    @Body() data: UpdateTaskStateDto,
    @UserId() requesterId: string
  ) {
    return this.tasksService.updateTaskState(id, data.state, requesterId);
  }

  @Patch(':id/assignee')
  updateTaskAssignee(
    @Param('id') id: string, 
    @Body() data: UpdateTaskAssigneeDto,
    @UserId() requesterId: string
  ) {
    return this.tasksService.updateTaskAssignee(id, data.assigneeId ?? null, requesterId);
  }

  @Patch(':id')
  updateTask(
    @Param('id') id: string,
    @Body() data: UpdateTaskDto,
    @UserId() requesterId: string
  ) {
    return this.tasksService.updateTask(id, data, requesterId);
  }
}
