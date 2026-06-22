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
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { CreateLocaleDto } from './dto/create-locale.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';
import { LocaleService } from './locale.service';

@ApiTags('locales')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Active tenant id (required for tenant-scoped routes)',
  required: true,
})
@UseInterceptors(TenantInterceptor)
@Controller('locales')
export class LocaleController {
  constructor(private readonly localeService: LocaleService) {}

  @Post()
  async create(@Body() dto: CreateLocaleDto, @Req() req: any) {
    const data = await this.localeService.create(req.tenant.schemaName, dto);
    return { message: 'Locale created successfully', data };
  }

  @Get()
  async findAll(@Req() req: any) {
    return {
      data: await this.localeService.findAll(req.tenant.schemaName),
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return {
      data: await this.localeService.findOne(req.tenant.schemaName, id),
    };
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLocaleDto,
    @Req() req: any,
  ) {
    const data = await this.localeService.update(
      req.tenant.schemaName,
      id,
      dto,
    );
    return { message: 'Locale updated successfully', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.localeService.remove(req.tenant.schemaName, id);
    return { message: 'Locale deleted successfully' };
  }
}
