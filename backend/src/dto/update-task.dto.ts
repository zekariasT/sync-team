import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TaskState } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskState)
  state?: TaskState;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  cycleId?: string;
}

export class UpdateTaskStateDto {
  @IsEnum(TaskState)
  state: TaskState;
}

export class UpdateTaskAssigneeDto {
  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}
