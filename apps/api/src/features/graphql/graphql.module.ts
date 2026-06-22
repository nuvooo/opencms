import { CommonModule } from '@/common/common.module';
import { Module } from '@nestjs/common';
import { ContentGraphqlResolver } from './content-graphql.resolver';

@Module({
  imports: [CommonModule],
  providers: [ContentGraphqlResolver],
})
export class GraphqlModule {}
