import { TenantInterceptor } from '@/common/interceptors/tenant.interceptor';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntriesService } from './entries.service';

@ApiTags('entries')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('entries')
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Post()
  async create(@Body() dto: CreateEntryDto, @Req() req: any) {
    const data = await this.entriesService.create(req.tenant.schemaName, dto);
    return { message: 'Entry created successfully', data };
  }

  @Get()
  @ApiQuery({ name: 'content_type_slug', required: false })
  @ApiQuery({ name: 'locale', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Req() req: any,
    @Query('content_type_slug') content_type_slug?: string,
    @Query('locale') locale?: string,
    @Query('status') status?: string,
    @Query('locale_group_id') locale_group_id?: string,
  ) {
    const data = await this.entriesService.findAll(req.tenant.schemaName, {
      content_type_slug,
      locale,
      status,
      locale_group_id,
    });
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const data = await this.entriesService.findOne(req.tenant.schemaName, id);
    return { data };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEntryDto,
    @Req() req: any,
  ) {
    const data = await this.entriesService.update(
      req.tenant.schemaName,
      id,
      dto,
    );
    return { message: 'Entry updated successfully', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.entriesService.remove(req.tenant.schemaName, id);
    return { message: 'Entry deleted successfully' };
  }
}
