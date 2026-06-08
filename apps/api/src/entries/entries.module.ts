import { TenantDbService } from '@/common/services';
import { Module } from '@nestjs/common';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';

@Module({
  controllers: [EntriesController],
  providers: [EntriesService, TenantDbService],
})
export class EntriesModule {}
