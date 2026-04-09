import { IsString, IsDateString } from 'class-validator';

export class CreateCycleDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
