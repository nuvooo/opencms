import { TenantInterceptor } from '@/common/interceptors/tenant.interceptor';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContentTypesService } from './content-types.service';
import { CreateContentTypeDto } from './dto/create-content-type.dto';
import { UpdateContentTypeDto } from './dto/update-content-type.dto';

@ApiTags('content-types')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('content-types')
export class ContentTypesController {
  constructor(private readonly contentTypesService: ContentTypesService) {}

  @Post()
  async create(@Body() dto: CreateContentTypeDto, @Req() req: any) {
    const data = await this.contentTypesService.create(
      req.tenant.schemaName,
      dto,
    );
    return { message: 'Content type created successfully', data };
  }

  @Get()
  async findAll(@Req() req: any) {
    const data = await this.contentTypesService.findAll(req.tenant.schemaName);
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const data = await this.contentTypesService.findOne(
      req.tenant.schemaName,
      id,
    );
    return { data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateContentTypeDto,
    @Req() req: any,
  ) {
    const data = await this.contentTypesService.update(
      req.tenant.schemaName,
      id,
      dto,
    );
    return { message: 'Content type updated successfully', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.contentTypesService.remove(req.tenant.schemaName, id);
    return { message: 'Content type deleted successfully' };
  }
}
