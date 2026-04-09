import { IsString, IsOptional, IsEmail, IsNotEmpty } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRoleDto {
  @IsString()
  @IsNotEmpty()
  role: string;
}

export class AddMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  role?: string;
}
