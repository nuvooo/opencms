import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PluginState } from './entities/plugin-state.entity';
import { PluginFilesService } from './plugin-files.service';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginMarketplaceService } from './plugin-marketplace.service';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginController } from './plugin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PluginState])],
  controllers: [PluginController],
  providers: [
    PluginLoaderService,
    PluginRegistryService,
    PluginFilesService,
    PluginMarketplaceService,
  ],
  exports: [PluginRegistryService],
})
export class PluginModule {}
