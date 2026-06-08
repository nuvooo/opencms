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
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EntriesService } from './entries.service';

@ApiTags('entries')
@ApiBearerAuth()
@Controller('entries')
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Post()
  create(@Body() dto: CreateEntryDto, @Req() req: any) {
    return this.entriesService.create(req.tenant.schemaName, dto);
  }

  @Get()
  @ApiQuery({ name: 'content_type_slug', required: false })
  @ApiQuery({ name: 'locale', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @Req() req: any,
    @Query('content_type_slug') content_type_slug?: string,
    @Query('locale') locale?: string,
    @Query('status') status?: string,
  ) {
    return this.entriesService.findAll(req.tenant.schemaName, {
      content_type_slug,
      locale,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.entriesService.findOne(req.tenant.schemaName, id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEntryDto,
    @Req() req: any,
  ) {
    return this.entriesService.update(req.tenant.schemaName, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.entriesService.remove(req.tenant.schemaName, id);
  }
}
