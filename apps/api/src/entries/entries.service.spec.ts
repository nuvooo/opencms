import { TenantDbService } from '@/common/services';
import { Test, TestingModule } from '@nestjs/testing';
import { EntriesService } from './entries.service';

describe('EntriesService', () => {
  let service: EntriesService;
  let query: jest.Mock;

  beforeEach(async () => {
    query = jest.fn().mockResolvedValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntriesService,
        {
          provide: TenantDbService,
          useValue: {
            withTenantDb: jest.fn((_schema: string, cb: any) => cb(query)),
          },
        },
      ],
    }).compile();

    service = module.get(EntriesService);
  });

  describe('findAll', () => {
    it('applies a bounded LIMIT/OFFSET instead of returning the whole table', async () => {
      await service.findAll('public', { limit: 20, offset: 40 });

      const [sql, values] = query.mock.calls[0];
      expect(sql).toMatch(/LIMIT \$\d+ OFFSET \$\d+/);
      expect(values).toEqual([20, 40]);
    });

    it('caps an oversized limit and defaults the offset', async () => {
      await service.findAll('public', { limit: 10000 });

      const [, values] = query.mock.calls[0];
      // capped to 100, offset defaults to 0
      expect(values).toEqual([100, 0]);
    });

    it('keeps filters and pagination params in order', async () => {
      await service.findAll('public', {
        content_type_slug: 'post',
        limit: 5,
        offset: 0,
      });

      const [sql, values] = query.mock.calls[0];
      expect(sql).toContain('"content_type_slug" = $1');
      expect(values).toEqual(['post', 5, 0]);
    });
  });
});
