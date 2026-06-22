import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { LocaleController } from './locale.controller';
import { LocaleService } from './locale.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [LocaleController],
  providers: [LocaleService],
  exports: [LocaleService],
})
export class LocaleModule {}
