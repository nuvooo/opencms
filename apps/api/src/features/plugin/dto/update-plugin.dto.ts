import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdatePluginDto {
  @ApiProperty({ description: 'Whether the plugin/feature is enabled' })
  @IsBoolean()
  enabled: boolean;
}
