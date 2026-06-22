import { Type } from 'class-transformer';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ValidateDbDto } from './validate-db.dto';

class SetupAppDto {
  @IsString()
  allowCorsUrl: string;

  @IsString()
  authSecret: string;

  @IsOptional()
  @IsString()
  authUrl?: string;
}

class SetupAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class BootstrapSetupDto {
  @IsObject()
  @ValidateNested()
  @Type(() => SetupAppDto)
  app: SetupAppDto;

  @IsObject()
  @ValidateNested()
  @Type(() => ValidateDbDto)
  database: ValidateDbDto;

  @IsObject()
  @ValidateNested()
  @Type(() => SetupAdminDto)
  admin: SetupAdminDto;
}
