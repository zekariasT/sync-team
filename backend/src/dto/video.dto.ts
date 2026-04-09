import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class AddReactionDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  timestamp: number;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
