import { validateString } from '@/common/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { CreateApiTokenDto } from './dto/create-api-token.dto';
import { ApiToken } from './entities/api-token.entity';

@Injectable()
export class ApiTokenService {
  constructor(
    @InjectRepository(ApiToken)
    private apiTokenRepository: Repository<ApiToken>,
  ) {}

  async create(userId: string, dto: CreateApiTokenDto) {
    const rawToken = randomBytes(32).toString('hex');
    const lastChars = rawToken.slice(-4);

    const token = this.apiTokenRepository.create({
      name: dto.name,
      token: rawToken,
      lastChars,
      userId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    await this.apiTokenRepository.save(token);

    return {
      id: token.id,
      name: token.name,
      lastChars: token.lastChars,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      token: rawToken,
    };
  }

  async findAll(userId: string) {
    return this.apiTokenRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: ['id', 'name', 'lastChars', 'createdAt', 'expiresAt'],
    });
  }

  async remove(id: string, userId: string) {
    const token = await this.apiTokenRepository.findOne({
      where: { id, userId },
    });
    if (!token) throw new NotFoundException('Token not found');
    await this.apiTokenRepository.remove(token);
  }

  async validateToken(rawToken: string) {
    // Narrow candidates by the indexed last characters first, so a bogus bearer
    // token costs one cheap lookup instead of an argon2 verify against every
    // stored token (which would be an unauthenticated CPU-exhaustion vector).
    const lastChars = rawToken.slice(-4);
    const tokens = await this.apiTokenRepository.find({
      where: { lastChars },
      relations: ['user'],
    });
    for (const t of tokens) {
      if (t.expiresAt && new Date() > t.expiresAt) continue;
      const valid = await validateString(rawToken, t.token);
      if (valid) {
        const { password, ...user } = t.user;
        return user;
      }
    }
    return null;
  }
}
