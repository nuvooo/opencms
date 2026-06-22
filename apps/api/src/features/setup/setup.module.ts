import { TransactionService } from '@/database';
import { User } from '@/features/users/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetupState } from './entities/setup-state.entity';
import { SetupEnvService } from './setup-env.service';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [TypeOrmModule.forFeature([SetupState, User])],
  controllers: [SetupController],
  providers: [SetupService, SetupEnvService, TransactionService],
})
export class SetupModule {}
