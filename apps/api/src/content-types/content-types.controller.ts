import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContentTypesService } from './content-types.service';
import { CreateContentTypeDto } from './dto/create-content-type.dto';
import { UpdateContentTypeDto } from './dto/update-content-type.dto';

@ApiTags('content-types')
@ApiBearerAuth()
@Controller('content-types')
export class ContentTypesController {
  constructor(private readonly contentTypesService: ContentTypesService) {}

  @Post()
  create(@Body() dto: CreateContentTypeDto, @Req() req: any) {
    return this.contentTypesService.create(req.tenant.schemaName, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.contentTypesService.findAll(req.tenant.schemaName);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.contentTypesService.findOne(req.tenant.schemaName, id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateContentTypeDto,
    @Req() req: any,
  ) {
    return this.contentTypesService.update(req.tenant.schemaName, id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.contentTypesService.remove(req.tenant.schemaName, id);
  }
}
