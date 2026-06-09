import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { RelationController } from './relation.controller';
import { RelationService } from './relation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [RelationController],
  providers: [RelationService],
  exports: [RelationService],
})
export class RelationModule {}
