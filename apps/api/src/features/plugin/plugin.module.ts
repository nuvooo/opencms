import { Module } from '@nestjs/common';
import { PluginFilesService } from './plugin-files.service';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginRegistryService } from './plugin-registry.service';
import { PluginController } from './plugin.controller';

@Module({
  controllers: [PluginController],
  providers: [PluginLoaderService, PluginRegistryService, PluginFilesService],
  exports: [PluginRegistryService],
})
export class PluginModule {}
