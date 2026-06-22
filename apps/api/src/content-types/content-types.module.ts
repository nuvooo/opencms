import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { ContentTypesController } from './content-types.controller';
import { ContentTypesService } from './content-types.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [ContentTypesController],
  providers: [ContentTypesService],
})
export class ContentTypesModule {}
