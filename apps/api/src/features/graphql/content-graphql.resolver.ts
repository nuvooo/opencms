import { TenantDbService } from '@/common/services';
import { EntriesService } from '@/entries/entries.service';
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

@Resolver()
export class ContentGraphqlResolver {
  constructor(
    private tenantDb: TenantDbService,
    private entriesService: EntriesService,
  ) {}

  private async getSchemaName(context: any): Promise<string> {
    const req = context.req;
    const tenantId = req.headers['x-tenant-id'] || req.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    const tenant = await this.tenantDb['tenantRepository'].findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    return tenant.schemaName;
  }

  @Query(() => [GraphQLJSON], { name: 'entries' })
  async getEntries(
    @Args('contentTypeSlug') contentTypeSlug: string,
    @Context() context: any,
    @Args('locale', { nullable: true }) locale?: string,
    @Args('status', { nullable: true }) status?: string,
    @Args('limit', { nullable: true }) limit?: number,
    @Args('offset', { nullable: true }) offset?: number,
  ) {
    const schemaName = await this.getSchemaName(context);
    return this.entriesService.findAll(schemaName, {
      content_type_slug: contentTypeSlug,
      locale,
      status,
    });
  }

  @Query(() => GraphQLJSON, { name: 'entry' })
  async getEntry(@Args('id') id: string, @Context() context: any) {
    const schemaName = await this.getSchemaName(context);
    return this.entriesService.findOne(schemaName, id);
  }

  @Mutation(() => GraphQLJSON, { name: 'createEntry' })
  async createEntry(
    @Args('contentTypeSlug') contentTypeSlug: string,
    @Args('fields', { type: () => GraphQLJSON }) fields: any,
    @Context() context: any,
    @Args('locale', { nullable: true }) locale?: string,
    @Args('status', { nullable: true }) status?: string,
  ) {
    const schemaName = await this.getSchemaName(context);
    return this.entriesService.create(schemaName, {
      content_type_slug: contentTypeSlug,
      fields,
      locale,
      status,
    });
  }

  @Mutation(() => GraphQLJSON, { name: 'updateEntry' })
  async updateEntry(
    @Args('id') id: string,
    @Context() context: any,
    @Args('fields', { type: () => GraphQLJSON, nullable: true }) fields?: any,
    @Args('locale', { nullable: true }) locale?: string,
    @Args('status', { nullable: true }) status?: string,
  ) {
    const schemaName = await this.getSchemaName(context);
    return this.entriesService.update(schemaName, id, {
      fields,
      locale,
      status,
    });
  }

  @Mutation(() => Boolean, { name: 'deleteEntry' })
  async deleteEntry(@Args('id') id: string, @Context() context: any) {
    const schemaName = await this.getSchemaName(context);
    await this.entriesService.remove(schemaName, id);
    return true;
  }
}
