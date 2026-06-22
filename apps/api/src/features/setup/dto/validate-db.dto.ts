import { IsBoolean, IsNumberString, IsString } from 'class-validator';

export class ValidateDbDto {
  @IsString()
  host: string;

  @IsNumberString()
  port: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  name: string;

  @IsBoolean()
  ssl: boolean;
}
