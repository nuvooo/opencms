import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './entities/media.entity';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
  ) {}

  async findAll(tenantId: string): Promise<Media[]> {
    return this.mediaRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Media> {
    const media = await this.mediaRepository.findOneBy({ id });
    if (!media) throw new NotFoundException('Media not found');
    return media;
  }

  async create(data: Partial<Media>): Promise<Media> {
    return this.mediaRepository.save(data);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const media = await this.mediaRepository.findOneBy({ id, tenantId });
    if (!media) throw new NotFoundException('Media not found');
    await this.mediaRepository.remove(media);
  }
}
