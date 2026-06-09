import { TenantInterceptor } from '@/common/interceptors/tenant.interceptor';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SetRelationsDto } from './dto/set-relations.dto';
import { RelationService } from './relation.service';

@ApiTags('relations')
@ApiBearerAuth()
@UseInterceptors(TenantInterceptor)
@Controller('relations')
export class RelationController {
  constructor(private readonly relationService: RelationService) {}

  @Post(':entryId')
  async setRelations(
    @Param('entryId') entryId: string,
    @Body() dto: SetRelationsDto,
    @Req() req: any,
  ) {
    await this.relationService.setRelations(
      req.tenant.schemaName,
      entryId,
      dto.fieldName,
      dto.relatedEntryIds,
    );
    return { message: 'Relations updated' };
  }

  @Get(':entryId/:fieldName')
  async getRelations(
    @Param('entryId') entryId: string,
    @Param('fieldName') fieldName: string,
    @Req() req: any,
  ) {
    return {
      data: await this.relationService.getRelations(
        req.tenant.schemaName,
        entryId,
        fieldName,
      ),
    };
  }

  @Get(':entryId/related')
  async getRelatedEntries(@Param('entryId') entryId: string, @Req() req: any) {
    return {
      data: await this.relationService.getRelatedEntries(
        req.tenant.schemaName,
        entryId,
      ),
    };
  }
}
