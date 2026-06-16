import { JwtAuthGuard } from '@/common/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  async create(@Body() dto: CreateTenantDto) {
    const data = await this.tenantsService.create(dto);
    return { message: 'Tenant created successfully', data };
  }

  @Get()
  async findAll() {
    const data = await this.tenantsService.findAll();
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.tenantsService.findOne(id);
    return { data };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    const data = await this.tenantsService.update(id, dto);
    return { message: 'Tenant updated successfully', data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.tenantsService.remove(id);
    return { message: 'Tenant deleted successfully' };
  }
}
