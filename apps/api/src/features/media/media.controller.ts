import { TenantInterceptor } from '@/common/interceptors/tenant.interceptor';
import { FileService } from '@/features/file/file.service';
import {
  FileInterceptor,
  MemoryStorageFile,
  UploadedFile,
} from '@blazity/nest-file-fastify';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateMediaDto } from './dto/create-media.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly fileService: FileService,
  ) {}

  @Get()
  async findAll(@Req() req: any) {
    const media = await this.mediaService.findAll(req.tenant.id);
    return { message: 'Media fetched successfully', data: media };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: MemoryStorageFile,
    @Body() dto: CreateMediaDto,
    @Req() req: any,
  ) {
    const { filename, filepath } = await this.fileService.uploadFile(file, {
      prefix: `${req.tenant.slug}/`,
    });

    const media = await this.mediaService.create({
      filename,
      originalName: file.fieldname || filename,
      mimeType: file.mimetype,
      size: file.buffer.length,
      filePath: filepath,
      altText: dto.altText,
      tenantId: req.tenant.id,
    });

    return { message: 'File uploaded successfully', data: media };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const media = await this.mediaService.findOne(id);
    await this.fileService.deleteFile(media.filePath);
    await this.mediaService.remove(id, req.tenant.id);
    return { message: 'Media deleted successfully' };
  }
}
