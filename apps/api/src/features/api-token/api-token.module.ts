import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiTokenController } from './api-token.controller';
import { ApiTokenService } from './api-token.service';
import { ApiToken } from './entities/api-token.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApiToken])],
  controllers: [ApiTokenController],
  providers: [ApiTokenService],
  exports: [ApiTokenService],
})
export class ApiTokenModule {}
