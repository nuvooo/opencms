import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class InstallMarketplacePluginDto {
  @ApiProperty({ description: 'Catalog id of the plugin to install' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'id must be lowercase kebab-case',
  })
  id: string;
}
