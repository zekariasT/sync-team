import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  senderId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
