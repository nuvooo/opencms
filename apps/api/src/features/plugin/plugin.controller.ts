import { Roles } from '@/common/decorators';
import { FileInterceptor, MemoryStorageFile } from '@blazity/nest-file-fastify';
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PluginFilesService } from './plugin-files.service';
import { PluginRegistryService } from './plugin-registry.service';

@ApiTags('plugins')
@ApiBearerAuth()
@Controller('plugins')
export class PluginController {
  constructor(
    private readonly pluginRegistry: PluginRegistryService,
    private readonly pluginFiles: PluginFilesService,
  ) {}

  @Get()
  findAll() {
    const plugins = this.pluginRegistry.getAll();
    return { message: 'Plugins fetched successfully', data: plugins };
  }

  @Post('install')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  install(@UploadedFile() file: MemoryStorageFile) {
    const pluginId = this.pluginFiles.installFromZip(file);
    const plugins = this.pluginRegistry.rescan();
    return {
      message: `Plugin ${pluginId} installed successfully`,
      data: plugins,
    };
  }

  @Post('rescan')
  @Roles('ADMIN')
  rescan() {
    const plugins = this.pluginRegistry.rescan();
    return { message: 'Plugins rescanned successfully', data: plugins };
  }

  @Delete(':id')
  @Roles('ADMIN')
  uninstall(@Param('id') id: string) {
    this.pluginRegistry.assertRemovable(id);
    this.pluginFiles.uninstall(id);
    const plugins = this.pluginRegistry.rescan();
    return { message: 'Plugin removed successfully', data: plugins };
  }
}
