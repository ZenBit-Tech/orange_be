import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marker } from './entities/marker.entity';
import { CreateMarkerDto, UpdateMarkerDto } from './dto/marker.dto';

@Injectable()
export class MarkerService {
  constructor(
    @InjectRepository(Marker)
    private markerRepository: Repository<Marker>,
  ) {}

  async create(createMarkerDto: CreateMarkerDto): Promise<Marker> {
    try {
      const marker = this.markerRepository.create(createMarkerDto);
      return await this.markerRepository.save(marker);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      throw new InternalServerErrorException(
        `Failed to create marker: ${errorMessage}`,
        errorStack,
      );
    }
  }

  async findAll(): Promise<Marker[]> {
    return await this.markerRepository.find({
      where: { isActive: true },
      order: { language: 'ASC', category: 'ASC', key: 'ASC' },
    });
  }

  async findByLanguage(language: string): Promise<Marker[]> {
    return await this.markerRepository.find({
      where: { language, isActive: true },
      order: { category: 'ASC', key: 'ASC' },
    });
  }

  async findByLanguageAndCategory(
    language: string,
    category: string,
  ): Promise<Marker[]> {
    return await this.markerRepository.find({
      where: { language, category, isActive: true },
      order: { key: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Marker> {
    const marker = await this.markerRepository.findOne({ where: { id } });
    if (!marker) {
      throw new NotFoundException(`Marker with ID ${id} not found`);
    }
    return marker;
  }

  async update(id: string, updateMarkerDto: UpdateMarkerDto): Promise<Marker> {
    const marker = await this.findOne(id);
    Object.assign(marker, updateMarkerDto);
    return await this.markerRepository.save(marker);
  }

  async remove(id: string): Promise<void> {
    const marker = await this.findOne(id);
    await this.markerRepository.remove(marker);
  }

  async bulkCreate(markers: CreateMarkerDto[]): Promise<Marker[]> {
    const entities = markers.map((dto) => this.markerRepository.create(dto));
    return await this.markerRepository.save(entities);
  }

  async getSupportedLanguages(): Promise<string[]> {
    const result = await this.markerRepository
      .createQueryBuilder('marker')
      .select('DISTINCT marker.language', 'language')
      .where('marker.isActive = :isActive', { isActive: true })
      .getRawMany();

    return result.map((r: { language: string }) => r.language);
  }

  async getCategories(): Promise<string[]> {
    const result = await this.markerRepository
      .createQueryBuilder('marker')
      .select('DISTINCT marker.category', 'category')
      .where('marker.isActive = :isActive', { isActive: true })
      .getRawMany();

    return result.map((r: { category: string }) => r.category);
  }

  async countByLanguage(): Promise<Record<string, number>> {
    const result: Array<{ language: string; count: string }> =
      await this.markerRepository
        .createQueryBuilder('marker')
        .select('marker.language', 'language')
        .addSelect('COUNT(*)', 'count')
        .where('marker.isActive = :isActive', { isActive: true })
        .groupBy('marker.language')
        .getRawMany();

    return result.reduce((acc: Record<string, number>, row) => {
      acc[row.language] = parseInt(row.count, 10);
      return acc;
    }, {});
  }
}
