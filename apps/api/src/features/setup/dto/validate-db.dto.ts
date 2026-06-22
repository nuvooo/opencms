import {
  IsBoolean,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export type SetupDbType = 'postgres' | 'mysql' | 'sqlite';

export class ValidateDbDto {
  /**
   * Database engine. Defaults to `postgres` for backwards compatibility with
   * the original installer payload. For `sqlite` only `database` (file path) is
   * required; the host/port/credentials are ignored.
   */
  @IsOptional()
  @IsIn(['postgres', 'mysql', 'sqlite'])
  type?: SetupDbType;

  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsNumberString()
  port?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  /** SQLite database file path (used only when type=sqlite). */
  @IsOptional()
  @IsString()
  database?: string;

  @IsOptional()
  @IsBoolean()
  ssl?: boolean;
}
