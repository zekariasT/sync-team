import { IsString, IsOptional, IsEmail, IsNotEmpty, IsTimeZone, MaxLength } from 'class-validator';

export class SyncUserDto {
  // Deprecated: the server derives the id from the verified Clerk token and
  // ignores this field; still accepted so existing clients don't 400 on the
  // whitelist. Remove once no client sends it.
  @IsOptional()
  @IsString()
  id?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  avatar?: string | null;

  // Must be a real IANA zone: MemberClock feeds it straight into Luxon's
  // setZone, and an arbitrary string renders "Invalid DateTime" for every
  // viewer (or P2000s the sync if it overflows the column).
  @IsOptional()
  @IsTimeZone()
  @MaxLength(64)
  timezone?: string;
}

export class UpdateMemberStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;
}
