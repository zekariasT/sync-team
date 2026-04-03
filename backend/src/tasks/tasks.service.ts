import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { TaskState } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  // Projects
  async getProjects(teamId: string) {
    return this.prisma.project.findMany({
      where: { teamId },
      include: { tasks: true }
    });
  }

  async createProject(teamId: string, data: { name: string; description?: string }) {
    return this.prisma.project.create({
      data: {
        teamId,
        name: data.name,
        description: data.description,
      }
    });
  }

  // Cycles
  async getCycles(teamId: string) {
    return this.prisma.cycle.findMany({
      where: { teamId },
      include: { tasks: true },
      orderBy: { startDate: 'desc' }
    });
  }

  async createCycle(teamId: string, data: { name: string; startDate: string; endDate: string }) {
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
  async getTasks(teamId: string) {
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
  }) {
    return this.prisma.task.create({
      data: {
        teamId,
        reporterId,
        ...data
      },
      include: { assignee: true, reporter: true }
    });
  }

  async updateTaskState(taskId: string, state: TaskState) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { state },
    });
  }

  async updateTaskAssignee(taskId: string, assigneeId: string | null) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { assigneeId },
    });
  }
}
