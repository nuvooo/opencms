import { Roles } from '@/common/decorators';
import { FileInterceptor, MemoryStorageFile } from '@blazity/nest-file-fastify';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InstallMarketplacePluginDto } from './dto/install-marketplace-plugin.dto';
import { UpdatePluginDto } from './dto/update-plugin.dto';
import { PluginFilesService } from './plugin-files.service';
import { PluginMarketplaceService } from './plugin-marketplace.service';
import { PluginRegistryService } from './plugin-registry.service';

@ApiTags('plugins')
@ApiBearerAuth()
@Controller('plugins')
export class PluginController {
  constructor(
    private readonly pluginRegistry: PluginRegistryService,
    private readonly pluginFiles: PluginFilesService,
    private readonly marketplace: PluginMarketplaceService,
  ) {}

  @Get()
  findAll() {
    const plugins = this.pluginRegistry.getAll();
    return { message: 'Plugins fetched successfully', data: plugins };
  }

  @Get('marketplace')
  @Roles('ADMIN')
  async marketplaceList() {
    const data = await this.marketplace.getMarketplace();
    return { message: 'Marketplace fetched successfully', data };
  }

  @Post('marketplace/install')
  @Roles('ADMIN')
  async marketplaceInstall(@Body() dto: InstallMarketplacePluginDto) {
    const plugins = await this.marketplace.install(dto.id);
    return {
      message: `Plugin ${dto.id} installed successfully`,
      data: plugins,
    };
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

  @Patch(':id')
  @Roles('ADMIN')
  async setEnabled(@Param('id') id: string, @Body() dto: UpdatePluginDto) {
    await this.pluginRegistry.setEnabled(id, dto.enabled);
    return {
      message: `Plugin ${id} ${dto.enabled ? 'enabled' : 'disabled'}`,
      data: this.pluginRegistry.getAll(),
    };
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
