import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { TaskState } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async checkTeamPermission(teamId: string, requesterId: string, allowedRoles: string[]) {
    if (!requesterId) throw new ForbiddenException('Unauthorized');
    const member = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: requesterId, teamId } }
    });
    const anyAdmin = await this.prisma.teamMember.findFirst({
      where: { userId: requesterId, role: 'ADMIN' }
    });
    
    if (anyAdmin) return true;
    if (!member) throw new ForbiddenException('You do not belong to this team');
    if (!allowedRoles.includes(member.role)) throw new ForbiddenException('Insufficient permissions');
    return true;
  }

  private async checkTaskPermission(taskId: string, requesterId: string, action: 'MOVE' | 'ASSIGN' | 'EDIT') {
    if (!requesterId) throw new ForbiddenException('Unauthorized');
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    
    const anyAdmin = await this.prisma.teamMember.findFirst({
      where: { userId: requesterId, role: 'ADMIN' }
    });
    if (anyAdmin) return task;

    const member = await this.prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: requesterId, teamId: task.teamId } }
    });

    if (!member) throw new ForbiddenException('You do not belong to this team');

    if (action === 'MOVE') {
       if (member.role === 'MEMBER' && task.assigneeId !== requesterId) {
          throw new ForbiddenException('Members can only move their assigned tasks');
       }
    }
    return task;
  }

  // Projects
  async getProjects(teamId: string, requesterId: string) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
    return this.prisma.project.findMany({
      where: { teamId },
      include: { tasks: true }
    });
  }

  async createProject(teamId: string, data: { name: string; description?: string }, requesterId: string) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD']);
    return this.prisma.project.create({
      data: {
        teamId,
        name: data.name,
        description: data.description,
      }
    });
  }

  // Cycles
  async getCycles(teamId: string, requesterId: string) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
    return this.prisma.cycle.findMany({
      where: { teamId },
      include: { tasks: true },
      orderBy: { startDate: 'desc' }
    });
  }

  async createCycle(teamId: string, data: { name: string; startDate: string; endDate: string }, requesterId: string) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD']);
    return this.prisma.cycle.create({
      data: {
        teamId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      }
    });
  }

  // Tasks
  async getTasks(teamId: string, requesterId: string) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD', 'MEMBER']);
    return this.prisma.task.findMany({
      where: { teamId },
      include: { assignee: true, reporter: true, project: true, cycle: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createTask(teamId: string, reporterId: string, data: {
    title: string;
    description?: string;
    state?: TaskState;
    assigneeId?: string;
    projectId?: string;
    cycleId?: string;
  }, requesterId: string) {
    await this.checkTeamPermission(teamId, requesterId, ['ADMIN', 'LEAD']);
    return this.prisma.task.create({
      data: {
        teamId,
        reporterId,
        ...data
      },
      include: { assignee: true, reporter: true }
    });
  }

  async updateTaskState(taskId: string, state: TaskState, requesterId: string) {
    await this.checkTaskPermission(taskId, requesterId, 'MOVE');
    return this.prisma.task.update({
      where: { id: taskId },
      data: { state },
    });
  }

  async updateTaskAssignee(taskId: string, assigneeId: string | null, requesterId: string) {
    await this.checkTaskPermission(taskId, requesterId, 'ASSIGN');
    return this.prisma.task.update({
      where: { id: taskId },
      data: { assigneeId },
    });
  }

  async updateTask(taskId: string, data: any, requesterId: string) {
    await this.checkTaskPermission(taskId, requesterId, 'EDIT');
    return this.prisma.task.update({
      where: { id: taskId },
      data: { 
        title: data.title,
        description: data.description,
        state: data.state,
        assigneeId: data.assigneeId,
        projectId: data.projectId,
        cycleId: data.cycleId
      },
    });
  }
}
