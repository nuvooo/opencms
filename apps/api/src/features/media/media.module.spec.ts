import { Tenant } from '@/tenants/tenant.entity';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileModule } from '../file/file.module';
import { FileService } from '../file/file.service';
import { Media } from './entities/media.entity';
import { MediaController } from './media.controller';
import { MediaModule } from './media.module';
import { MediaService } from './media.service';

// Stub avoids pulling in the real nestjs-pino LoggerModule (needs forRoot) that
// FileModule transitively imports; we only care about MediaModule's own wiring.
@Module({
  providers: [{ provide: FileService, useValue: {} }],
  exports: [FileService],
})
class StubFileModule {}

describe('MediaModule', () => {
  it('registers the media controller and service', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MediaModule],
    })
      .overrideModule(FileModule)
      .useModule(StubFileModule)
      .overrideProvider(getRepositoryToken(Media))
      .useValue({})
      .overrideProvider(getRepositoryToken(Tenant))
      .useValue({})
      .compile();

    expect(moduleRef.get(MediaController)).toBeInstanceOf(MediaController);
    expect(moduleRef.get(MediaService)).toBeInstanceOf(MediaService);
  });
});
