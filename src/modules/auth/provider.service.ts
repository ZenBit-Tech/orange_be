import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Provider } from './entities/provider.entity';
import { CreateProviderDto } from './dto/create.provider.dto';

@Injectable()
export class ProviderService {
  constructor(
    @InjectRepository(Provider)
    private providerRepository: Repository<Provider>,
  ) {}

  async create(provider: CreateProviderDto): Promise<Provider> {
    const newProvider = this.providerRepository.create(provider);
    return await this.providerRepository.save(newProvider);
  }

  async findOneBy(
    where: FindOptionsWhere<Provider> | FindOptionsWhere<Provider>[],
  ): Promise<Provider | null> {
    return this.providerRepository.findOne({ where });
  }
}
