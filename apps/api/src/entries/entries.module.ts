import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { EntriesController } from './entries.controller';
import { EntriesService } from './entries.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [EntriesController],
  providers: [EntriesService],
})
export class EntriesModule {}
