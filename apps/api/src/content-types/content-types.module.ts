import { TenantDbService } from '@/common/services';
import { Module } from '@nestjs/common';
import { ContentTypesController } from './content-types.controller';
import { ContentTypesService } from './content-types.service';

@Module({
  controllers: [ContentTypesController],
  providers: [ContentTypesService, TenantDbService],
})
export class ContentTypesModule {}
