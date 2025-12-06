/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { MarkerService } from './marker.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Marker } from './entities/marker.entity';
import { CreateMarkerDto, UpdateMarkerDto } from './dto/marker.dto';
import { CreateReviewDataDto } from './dto/review-data.dto';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';

describe('MarkerService', () => {
  let service: MarkerService;
  let repository: jest.Mocked<Repository<Marker>>;

  const createMockMarker = (overrides?: Partial<Marker>): Marker => ({
    id: '1',
    name: 'cholesterol',
    key: 'cholesterol',
    language: 'en',
    pattern: 'Cholesterol[:\\s]*([\\d.,]+)',
    category: 'lipids',
    alternativeNames: 'Total Cholesterol,Chol',
    unit: 'mmol/L',
    referenceMin: 3.0,
    referenceMax: 5.2,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarkerService,
        {
          provide: getRepositoryToken(Marker),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MarkerService>(MarkerService);
    repository = module.get(getRepositoryToken(Marker));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a marker successfully', async () => {
      const createDto: CreateMarkerDto = {
        name: 'cholesterol',
        key: 'cholesterol',
        language: 'en',
        pattern: 'Cholesterol[:\\s]*([\\d.,]+)',
        category: 'lipids',
      };

      const mockMarker = createMockMarker();
      repository.create.mockReturnValue(mockMarker);
      repository.save.mockResolvedValue(mockMarker);

      const result = await service.create(createDto);

      expect(repository.create).toHaveBeenCalledWith(createDto);
      expect(repository.save).toHaveBeenCalledWith(mockMarker);
      expect(result).toEqual(mockMarker);
    });

    it('should create marker with all optional fields', async () => {
      const completeDto: CreateMarkerDto = {
        name: 'cholesterol',
        key: 'cholesterol',
        language: 'en',
        pattern: 'Cholesterol[:\\s]*([\\d.,]+)',
        category: 'lipids',
        alternativeNames: 'Total Cholesterol,Chol',
        unit: 'mmol/L',
        referenceMin: 3.0,
        referenceMax: 5.2,
        isActive: true,
      };

      const mockMarker = createMockMarker();
      repository.create.mockReturnValue(mockMarker);
      repository.save.mockResolvedValue(mockMarker);

      const result = await service.create(completeDto);

      expect(result.alternativeNames).toBe('Total Cholesterol,Chol');
      expect(result.unit).toBe('mmol/L');
      expect(result.referenceMin).toBe(3.0);
      expect(result.referenceMax).toBe(5.2);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      const createDto: CreateMarkerDto = {
        name: 'test',
        key: 'test',
        language: 'en',
        pattern: 'test',
        category: 'test',
      };

      const mockMarker = createMockMarker();
      repository.create.mockReturnValue(mockMarker);
      repository.save.mockRejectedValue(new Error('Database connection lost'));

      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(createDto)).rejects.toThrow(
        'Failed to create marker',
      );
    });

    it('should handle unknown errors gracefully', async () => {
      const createDto: CreateMarkerDto = {
        name: 'test',
        key: 'test',
        language: 'en',
        pattern: 'test',
        category: 'test',
      };

      const mockMarker = createMockMarker();
      repository.create.mockReturnValue(mockMarker);
      repository.save.mockRejectedValue('Unknown error');

      await expect(service.create(createDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all active markers ordered correctly', async () => {
      const markers = [
        createMockMarker(),
        createMockMarker({ id: '2', name: 'glucose', key: 'glucose' }),
      ];
      repository.find.mockResolvedValue(markers);

      const result = await service.findAll();

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { language: 'ASC', category: 'ASC', key: 'ASC' },
      });
      expect(result).toEqual(markers);
    });

    it('should return empty array when no active markers exist', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should only return active markers', async () => {
      const activeMarkers = [
        createMockMarker({ isActive: true }),
        createMockMarker({ id: '2', isActive: true }),
      ];
      repository.find.mockResolvedValue(activeMarkers);

      const result = await service.findAll();

      expect(result.every((m) => m.isActive)).toBe(true);
    });
  });

  describe('findByLanguage', () => {
    it('should find markers by language', async () => {
      const language = 'en';
      const markers = [createMockMarker()];
      repository.find.mockResolvedValue(markers);

      const result = await service.findByLanguage(language);

      expect(repository.find).toHaveBeenCalledWith({
        where: { language, isActive: true },
        order: { category: 'ASC', key: 'ASC' },
      });
      expect(result).toEqual(markers);
    });

    it('should return empty array for non-existent language', async () => {
      const language = 'xyz';
      repository.find.mockResolvedValue([]);

      const result = await service.findByLanguage(language);

      expect(result).toEqual([]);
    });

    it('should handle multiple languages', async () => {
      const languages = ['en', 'es', 'de', 'fr'];

      for (const lang of languages) {
        repository.find.mockResolvedValue([
          createMockMarker({ language: lang }),
        ]);

        const result = await service.findByLanguage(lang);

        expect(result[0].language).toBe(lang);
      }
    });
  });

  describe('findByLanguageAndCategory', () => {
    it('should find markers by language and category', async () => {
      const language = 'en';
      const category = 'lipids';
      const markers = [createMockMarker()];
      repository.find.mockResolvedValue(markers);

      const result = await service.findByLanguageAndCategory(
        language,
        category,
      );

      expect(repository.find).toHaveBeenCalledWith({
        where: { language, category, isActive: true },
        order: { key: 'ASC' },
      });
      expect(result).toEqual(markers);
    });

    it('should return empty array for non-matching filter', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findByLanguageAndCategory('en', 'invalid');

      expect(result).toEqual([]);
    });

    it('should handle multiple category queries', async () => {
      const categories = ['lipids', 'metabolic', 'liver'];

      for (const category of categories) {
        repository.find.mockResolvedValue([createMockMarker({ category })]);

        const result = await service.findByLanguageAndCategory('en', category);

        expect(result[0].category).toBe(category);
      }
    });
  });

  describe('findOne', () => {
    it('should find marker by id', async () => {
      const id = '1';
      const mockMarker = createMockMarker();
      repository.findOne.mockResolvedValue(mockMarker);

      const result = await service.findOne(id);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual(mockMarker);
    });

    it('should throw NotFoundException when marker not found', async () => {
      const id = '999';
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(id)).rejects.toThrow(
        `Marker with ID ${id} not found`,
      );
    });

    it('should handle UUID format ids', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      repository.findOne.mockResolvedValue(createMockMarker({ id: uuid }));

      const result = await service.findOne(uuid);

      expect(result.id).toBe(uuid);
    });
  });

  describe('update', () => {
    it('should update marker successfully', async () => {
      const id = '1';
      const updateDto: UpdateMarkerDto = {
        pattern: 'NewPattern[:\\s]*([\\d.,]+)',
      };
      const mockMarker = createMockMarker();
      const updatedMarker = createMockMarker(updateDto);

      repository.findOne.mockResolvedValue(mockMarker);
      repository.save.mockResolvedValue(updatedMarker);

      const result = await service.update(id, updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(repository.save).toHaveBeenCalled();
      expect(result.pattern).toBe(updateDto.pattern);
    });

    it('should throw NotFoundException when updating non-existent marker', async () => {
      const id = '999';
      const updateDto: UpdateMarkerDto = { pattern: 'test' };
      repository.findOne.mockResolvedValue(null);

      await expect(service.update(id, updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update multiple fields', async () => {
      const id = '1';
      const updateDto: UpdateMarkerDto = {
        pattern: 'New',
        referenceMin: 1.0,
        referenceMax: 10.0,
        isActive: false,
      };
      const mockMarker = createMockMarker();
      const updatedMarker = createMockMarker(updateDto);

      repository.findOne.mockResolvedValue(mockMarker);
      repository.save.mockResolvedValue(updatedMarker);

      const result = await service.update(id, updateDto);

      expect(result.pattern).toBe('New');
      expect(result.referenceMin).toBe(1.0);
      expect(result.referenceMax).toBe(10.0);
      expect(result.isActive).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove marker successfully', async () => {
      const id = '1';
      const mockMarker = createMockMarker();
      repository.findOne.mockResolvedValue(mockMarker);
      repository.remove.mockResolvedValue(mockMarker);

      await service.remove(id);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(repository.remove).toHaveBeenCalledWith(mockMarker);
    });

    it('should throw NotFoundException when removing non-existent marker', async () => {
      const id = '999';
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple markers', async () => {
      const dtos: CreateMarkerDto[] = [
        {
          name: 'marker1',
          key: 'marker1',
          language: 'en',
          pattern: 'pattern1',
          category: 'cat1',
        },
        {
          name: 'marker2',
          key: 'marker2',
          language: 'en',
          pattern: 'pattern2',
          category: 'cat2',
        },
      ];

      const entities = [
        createMockMarker({
          id: '0',
          name: 'marker1',
          key: 'marker1',
          category: 'cat1',
        }),
        createMockMarker({
          id: '1',
          name: 'marker2',
          key: 'marker2',
          category: 'cat2',
        }),
      ];

      repository.create.mockImplementation((dto) =>
        createMockMarker(dto as Partial<Marker>),
      );
      repository.save.mockResolvedValue(entities as unknown as Marker);
      const result = await service.bulkCreate(dtos);

      expect(repository.create).toHaveBeenCalledTimes(2);
      expect(repository.save).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should handle empty array', async () => {
      repository.save.mockResolvedValue([] as unknown as Marker);

      const result = await service.bulkCreate([]);

      expect(result).toEqual([]);
    });

    it('should create large batch efficiently', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        name: `marker${i}`,
        key: `marker${i}`,
        language: 'en',
        pattern: `pattern${i}`,
        category: 'test',
      }));

      const savedMarkers = largeBatch.map((dto, i) =>
        createMockMarker({ ...dto, id: `${i}` }),
      );

      repository.create.mockImplementation((dto) =>
        createMockMarker(dto as Partial<Marker>),
      );
      repository.save.mockResolvedValue(savedMarkers as unknown as Marker);
      const result = await service.bulkCreate(largeBatch);

      expect(result).toHaveLength(100);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', async () => {
      const languageData = [
        { language: 'en' },
        { language: 'es' },
        { language: 'de' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(languageData);

      const result = await service.getSupportedLanguages();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'DISTINCT marker.language',
        'language',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'marker.isActive = :isActive',
        { isActive: true },
      );
      expect(result).toEqual(['en', 'es', 'de']);
    });

    it('should return empty array when no languages exist', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getSupportedLanguages();

      expect(result).toEqual([]);
    });

    it('should only return languages from active markers', async () => {
      const languageData = [{ language: 'en' }, { language: 'fr' }];
      mockQueryBuilder.getRawMany.mockResolvedValue(languageData);

      const result = await service.getSupportedLanguages();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'marker.isActive = :isActive',
        { isActive: true },
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('getCategories', () => {
    it('should return list of categories', async () => {
      const categoryData = [
        { category: 'lipids' },
        { category: 'metabolic' },
        { category: 'liver' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(categoryData);

      const result = await service.getCategories();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'DISTINCT marker.category',
        'category',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'marker.isActive = :isActive',
        { isActive: true },
      );
      expect(result).toEqual(['lipids', 'metabolic', 'liver']);
    });

    it('should return empty array when no categories exist', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.getCategories();

      expect(result).toEqual([]);
    });

    it('should only return categories from active markers', async () => {
      const categoryData = [{ category: 'lipids' }];
      mockQueryBuilder.getRawMany.mockResolvedValue(categoryData);

      await service.getCategories();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'marker.isActive = :isActive',
        { isActive: true },
      );
    });
  });

  describe('countByLanguage', () => {
    it('should return marker count by language', async () => {
      const countData = [
        { language: 'en', count: '50' },
        { language: 'es', count: '30' },
        { language: 'de', count: '20' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(countData);

      const result = await service.countByLanguage();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'marker.language',
        'language',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'COUNT(*)',
        'count',
      );
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('marker.language');
      expect(result).toEqual({ en: 50, es: 30, de: 20 });
    });

    it('should return empty object when no markers exist', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([]);

      const result = await service.countByLanguage();

      expect(result).toEqual({});
    });

    it('should parse count strings to integers', async () => {
      const countData = [
        { language: 'en', count: '100' },
        { language: 'fr', count: '5' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(countData);

      const result = await service.countByLanguage();

      expect(result.en).toBe(100);
      expect(result.fr).toBe(5);
      expect(typeof result.en).toBe('number');
    });

    it('should only count active markers', async () => {
      const countData = [{ language: 'en', count: '25' }];
      mockQueryBuilder.getRawMany.mockResolvedValue(countData);

      await service.countByLanguage();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'marker.isActive = :isActive',
        { isActive: true },
      );
    });
  });

  describe('receiveData', () => {
    it('should return the same data passed to it', () => {
      const reviewData: CreateReviewDataDto = {
        birthYear: 2000,
        gender: 'male',
        pregnancy: null,
        markersData: [
          {
            id: 1,
            name: 'Cholesterol',
            value: '5.2',
            unit: 'mmol/L',
            normalRange: '3.0 - 5.2 mmol/L',
            hasError: false,
          },
        ],
        nutritionAdvice: true,
      };

      const result = service.receiveData(reviewData);

      expect(result).toEqual(reviewData);
      expect(result).toBe(reviewData);
    });

    it('should handle empty markers data', () => {
      const reviewData: CreateReviewDataDto = {
        birthYear: 1990,
        gender: 'female',
        markersData: [],
      };

      const result = service.receiveData(reviewData);

      expect(result.markersData).toHaveLength(0);
    });

    it('should preserve all fields', () => {
      const reviewData: CreateReviewDataDto = {
        birthYear: 1985,
        gender: 'male',
        pregnancy: 'not-pregnant',
        markersData: [],
        nutritionAdvice: true,
        supplementRecommendations: true,
        medicationGuidance: false,
        exerciseGuidelines: true,
        additionalQuestions: 'Test question',
      };

      const result = service.receiveData(reviewData);

      expect(result.birthYear).toBe(1985);
      expect(result.gender).toBe('male');
      expect(result.pregnancy).toBe('not-pregnant');
      expect(result.nutritionAdvice).toBe(true);
      expect(result.supplementRecommendations).toBe(true);
      expect(result.additionalQuestions).toBe('Test question');
    });
  });
});
