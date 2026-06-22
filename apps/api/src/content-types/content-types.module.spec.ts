import { CommonModule } from '@/common/common.module';
import { Tenant } from '@/tenants/tenant.entity';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContentTypesModule } from './content-types.module';
import { ContentTypesService } from './content-types.service';

// Regression: ContentTypesService injects TenantDbService, which is only
// available because CommonModule provides and globally exports it. Without that
// wiring the whole application fails to boot.
describe('ContentTypesModule', () => {
  it('resolves ContentTypesService with TenantDbService from the global CommonModule', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        CommonModule,
        ContentTypesModule,
      ],
    })
      .overrideProvider(getRepositoryToken(Tenant))
      .useValue({})
      .compile();

    expect(moduleRef.get(ContentTypesService)).toBeInstanceOf(
      ContentTypesService,
    );
  });
});
