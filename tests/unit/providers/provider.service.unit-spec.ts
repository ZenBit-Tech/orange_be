import { Test, TestingModule } from '@nestjs/testing';
import { Provider } from '@modules/auth/entities/provider.entity';

import { ProviderService } from '@modules/auth/provider.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateProviderDto } from '@modules/auth/dto/create.provider.dto';
import { ProviderEnum } from '@common/enums/providers.enums';
import { Repository } from 'typeorm';

describe('ProviderService', () => {
  let service: ProviderService;
  let mockProviderRepository: Repository<Provider>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderService,
        {
          provide: getRepositoryToken(Provider),
          useValue: {
            create: jest.fn(),
            findOneBy: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProviderService>(ProviderService);
    mockProviderRepository = module.get<Repository<Provider>>(
      getRepositoryToken(Provider),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create => Should create a new provider and return its data', async () => {
    const createProviderDto = {
      name: ProviderEnum.Google,
    } as CreateProviderDto;

    const provider = {
      id: 'some-uuid',
      name: ProviderEnum.Google,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Provider;

    jest.spyOn(mockProviderRepository, 'create').mockReturnValue(provider);

    jest.spyOn(mockProviderRepository, 'save').mockResolvedValue(provider);

    const result = await service.create(createProviderDto);

    expect(result).toEqual(provider);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockProviderRepository.create).toHaveBeenCalledWith(
      createProviderDto,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockProviderRepository.save).toHaveBeenCalledWith(provider);
  });
});
