import { IsString, IsOptional, IsEmail, IsNotEmpty } from 'class-validator';

export class SyncUserDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string | null;
}

export class UpdateMemberStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}
