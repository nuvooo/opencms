import { IsBoolean } from 'class-validator';

export class SetupStatusResponse {
  @IsBoolean()
  initialized: boolean;

  @IsBoolean()
  inProgress: boolean;
}
