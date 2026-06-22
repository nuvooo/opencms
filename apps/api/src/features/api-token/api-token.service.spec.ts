import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTokenService } from './api-token.service';
import { ApiToken } from './entities/api-token.entity';

import { validateString } from '@/common/utils';

jest.mock('@/common/utils', () => ({
  ...jest.requireActual('@/common/utils'),
  validateString: jest.fn(),
}));

describe('ApiTokenService', () => {
  let service: ApiTokenService;
  let repo: jest.Mocked<
    Pick<Repository<ApiToken>, 'find' | 'findOne' | 'remove'>
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiTokenService,
        {
          provide: getRepositoryToken(ApiToken),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ApiTokenService);
    repo = module.get(getRepositoryToken(ApiToken));
    (validateString as jest.Mock).mockReset();
  });

  describe('validateToken', () => {
    it('narrows the candidate rows by the last characters instead of scanning every token', async () => {
      repo.find.mockResolvedValue([]);

      // 64-hex token -> last 4 chars are 'cafe'
      await service.validateToken('a'.repeat(60) + 'cafe');

      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { lastChars: 'cafe' } }),
      );
    });

    it('returns the user without the password hash when a candidate matches', async () => {
      repo.find.mockResolvedValue([
        {
          token: 'hashed',
          expiresAt: undefined,
          user: { id: 'u1', email: 'a@b.c', password: 'secret' },
        } as unknown as ApiToken,
      ]);
      (validateString as jest.Mock).mockResolvedValue(true);

      const result = await service.validateToken('x'.repeat(60) + 'beef');

      expect(result).toEqual({ id: 'u1', email: 'a@b.c' });
      expect((result as { password?: string }).password).toBeUndefined();
    });

    it('returns null when no candidate matches', async () => {
      repo.find.mockResolvedValue([
        {
          token: 'hashed',
          user: { id: 'u1', password: 'secret' },
        } as unknown as ApiToken,
      ]);
      (validateString as jest.Mock).mockResolvedValue(false);

      const result = await service.validateToken('x'.repeat(60) + 'dead');

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the token does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
