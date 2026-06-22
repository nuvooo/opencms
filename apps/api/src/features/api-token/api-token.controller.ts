import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiTokenService } from './api-token.service';
import { CreateApiTokenDto } from './dto/create-api-token.dto';

@ApiTags('api-tokens')
@ApiBearerAuth()
@Controller('api-tokens')
export class ApiTokenController {
  constructor(private readonly apiTokenService: ApiTokenService) {}

  @Post()
  async create(@Body() dto: CreateApiTokenDto, @Req() req: any) {
    const data = await this.apiTokenService.create(req.user.id, dto);
    return { message: 'API token created successfully', data };
  }

  @Get()
  async findAll(@Req() req: any) {
    const data = await this.apiTokenService.findAll(req.user.id);
    return { data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.apiTokenService.remove(id, req.user.id);
    return { message: 'API token deleted successfully' };
  }
}
