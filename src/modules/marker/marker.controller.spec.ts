/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { MarkerController } from './marker.controller';
import { MarkerService } from './marker.service';
import { CreateMarkerDto, UpdateMarkerDto } from './dto/marker.dto';
import { Marker } from './entities/marker.entity';
import { CreateReviewDataDto } from './dto/review-data.dto';

describe('MarkerController', () => {
  let controller: MarkerController;
  let service: jest.Mocked<MarkerService>;

  const mockMarkerService = {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findAll: jest.fn(),
    findByLanguage: jest.fn(),
    findByLanguageAndCategory: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    receiveData: jest.fn(),
    getSupportedLanguages: jest.fn(),
    getCategories: jest.fn(),
    countByLanguage: jest.fn(),
  };

  const mockMarker: Marker = {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Marker;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarkerController],
      providers: [{ provide: MarkerService, useValue: mockMarkerService }],
    }).compile();

    controller = module.get<MarkerController>(MarkerController);
    service = module.get(MarkerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new marker', async () => {
      const createDto: CreateMarkerDto = {
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

      service.create.mockResolvedValue(mockMarker);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockMarker);
      expect(result.name).toBe('cholesterol');
      expect(result.key).toBe('cholesterol');
    });

    it('should create marker with minimal required fields', async () => {
      const minimalDto: CreateMarkerDto = {
        name: 'glucose',
        key: 'glucose',
        language: 'en',
        pattern: 'Glucose[:\\s]*([\\d.,]+)',
        category: 'metabolic',
      };

      const minimalMarker = {
        ...mockMarker,
        name: 'glucose',
        key: 'glucose',
        category: 'metabolic',
        alternativeNames: undefined,
        unit: undefined,
        referenceMin: undefined,
        referenceMax: undefined,
      };

      service.create.mockResolvedValue(minimalMarker);

      const result = await controller.create(minimalDto);

      expect(result.name).toBe('glucose');
      expect(result.category).toBe('metabolic');
    });

    it('should handle errors during marker creation', async () => {
      const createDto: CreateMarkerDto = {
        name: 'test',
        key: 'test',
        language: 'en',
        pattern: 'test',
        category: 'test',
      };
      service.create.mockRejectedValue(new Error('Creation failed'));

      await expect(controller.create(createDto)).rejects.toThrow(
        'Creation failed',
      );
    });

    it('should create marker with reference ranges', async () => {
      const dtoWithRanges: CreateMarkerDto = {
        name: 'hemoglobin',
        key: 'hemoglobin',
        language: 'en',
        pattern: 'Hemoglobin[:\\s]*([\\d.,]+)',
        category: 'blood',
        unit: 'g/dL',
        referenceMin: 13.0,
        referenceMax: 17.0,
      };

      service.create.mockResolvedValue({
        ...mockMarker,
        ...dtoWithRanges,
      });

      const result = await controller.create(dtoWithRanges);

      expect(result.referenceMin).toBe(13.0);
      expect(result.referenceMax).toBe(17.0);
    });

    it('should create marker with alternative names', async () => {
      const dtoWithAltNames: CreateMarkerDto = {
        name: 'cholesterol',
        key: 'cholesterol',
        language: 'en',
        pattern: 'Cholesterol[:\\s]*([\\d.,]+)',
        category: 'lipids',
        alternativeNames: 'Total Cholesterol,Chol,TC',
      };

      service.create.mockResolvedValue({
        ...mockMarker,
        alternativeNames: 'Total Cholesterol,Chol,TC',
      });

      const result = await controller.create(dtoWithAltNames);

      expect(result.alternativeNames).toBe('Total Cholesterol,Chol,TC');
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple markers', async () => {
      const markers: CreateMarkerDto[] = [
        {
          name: 'cholesterol',
          key: 'cholesterol',
          language: 'en',
          pattern: 'Cholesterol[:\\s]*([\\d.,]+)',
          category: 'lipids',
        },
        {
          name: 'glucose',
          key: 'glucose',
          language: 'en',
          pattern: 'Glucose[:\\s]*([\\d.,]+)',
          category: 'metabolic',
        },
      ];

      const createdMarkers = [
        mockMarker,
        {
          ...mockMarker,
          id: '2',
          name: 'glucose',
          key: 'glucose',
          category: 'metabolic',
        },
      ];
      service.bulkCreate.mockResolvedValue(createdMarkers);

      const result = await controller.bulkCreate(markers);

      expect(service.bulkCreate).toHaveBeenCalledWith(markers);
      expect(result).toEqual(createdMarkers);
      expect(result).toHaveLength(2);
    });

    it('should handle empty array', async () => {
      service.bulkCreate.mockResolvedValue([]);

      const result = await controller.bulkCreate([]);

      expect(result).toEqual([]);
      expect(service.bulkCreate).toHaveBeenCalledWith([]);
    });

    it('should create large batch of markers', async () => {
      const largeMarkerSet: CreateMarkerDto[] = Array.from(
        { length: 50 },
        (_, i) => ({
          name: `marker_${i}`,
          key: `marker_${i}`,
          language: 'en',
          pattern: `Marker${i}[:\\s]*([\\d.,]+)`,
          category: 'test',
        }),
      );

      const createdMarkers = largeMarkerSet.map((dto, i) => ({
        ...mockMarker,
        id: `${i}`,
        name: dto.name,
        key: dto.key,
      }));

      service.bulkCreate.mockResolvedValue(createdMarkers);

      const result = await controller.bulkCreate(largeMarkerSet);

      expect(result).toHaveLength(50);
    });

    it('should handle bulk create with mixed optional fields', async () => {
      const markers: CreateMarkerDto[] = [
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
          unit: 'mg/dL',
          referenceMin: 0,
          referenceMax: 100,
        },
      ];

      service.bulkCreate.mockResolvedValue(
        markers.map((m, i) => ({ ...mockMarker, ...m, id: `${i}` })),
      );

      const result = await controller.bulkCreate(markers);

      expect(result).toHaveLength(2);
      expect(result[1].unit).toBe('mg/dL');
    });
  });

  describe('findAll', () => {
    it('should return all active markers ordered by language, category, key', async () => {
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', name: 'glucose', key: 'glucose' },
      ];
      service.findAll.mockResolvedValue(markers);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(markers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no markers exist', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });

    it('should return only active markers', async () => {
      const activeMarkers = [
        { ...mockMarker, isActive: true },
        { ...mockMarker, id: '2', isActive: true },
      ];
      service.findAll.mockResolvedValue(activeMarkers);

      const result = await controller.findAll();

      expect(result.every((m) => m.isActive)).toBe(true);
    });

    it('should return markers from different categories', async () => {
      const markers = [
        { ...mockMarker, category: 'lipids' },
        { ...mockMarker, id: '2', category: 'metabolic' },
        { ...mockMarker, id: '3', category: 'liver' },
      ];
      service.findAll.mockResolvedValue(markers);

      const result = await controller.findAll();

      const categories = result.map((m) => m.category);
      expect(categories).toContain('lipids');
      expect(categories).toContain('metabolic');
      expect(categories).toContain('liver');
    });
  });

  describe('findByLanguage', () => {
    it('should return markers for specific language', async () => {
      const language = 'en';
      const markers = [mockMarker];
      service.findByLanguage.mockResolvedValue(markers);

      const result = await controller.findByLanguage(language);

      expect(service.findByLanguage).toHaveBeenCalledWith(language);
      expect(result).toEqual(markers);
      expect(result[0].language).toBe(language);
    });

    it('should return empty array for language with no markers', async () => {
      const language = 'fr';
      service.findByLanguage.mockResolvedValue([]);

      const result = await controller.findByLanguage(language);

      expect(result).toEqual([]);
    });

    it('should handle different languages', async () => {
      const languages = ['en', 'es', 'de', 'fr', 'pl'];

      for (const lang of languages) {
        service.findByLanguage.mockResolvedValue([
          { ...mockMarker, language: lang },
        ]);

        const result = await controller.findByLanguage(lang);

        expect(service.findByLanguage).toHaveBeenCalledWith(lang);
        expect(result[0].language).toBe(lang);
      }
    });

    it('should return multiple markers for same language ordered by category and key', async () => {
      const language = 'en';
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', name: 'glucose', key: 'glucose' },
        { ...mockMarker, id: '3', name: 'hemoglobin', key: 'hemoglobin' },
      ];
      service.findByLanguage.mockResolvedValue(markers);

      const result = await controller.findByLanguage(language);

      expect(result).toHaveLength(3);
      expect(result.every((m) => m.language === language)).toBe(true);
    });
  });

  describe('findByLanguageAndCategory', () => {
    it('should return markers filtered by language and category', async () => {
      const language = 'en';
      const category = 'lipids';
      const markers = [mockMarker];
      service.findByLanguageAndCategory.mockResolvedValue(markers);

      const result = await controller.findByLanguageAndCategory(
        language,
        category,
      );

      expect(service.findByLanguageAndCategory).toHaveBeenCalledWith(
        language,
        category,
      );
      expect(result).toEqual(markers);
      expect(result[0].language).toBe(language);
      expect(result[0].category).toBe(category);
    });

    it('should return empty array for non-matching filters', async () => {
      const language = 'en';
      const category = 'NonExistent';
      service.findByLanguageAndCategory.mockResolvedValue([]);

      const result = await controller.findByLanguageAndCategory(
        language,
        category,
      );

      expect(result).toEqual([]);
    });

    it('should handle multiple categories per language', async () => {
      const language = 'en';
      const categories = ['lipids', 'metabolic', 'liver', 'kidney'];

      for (const category of categories) {
        service.findByLanguageAndCategory.mockResolvedValue([
          { ...mockMarker, language, category },
        ]);

        const result = await controller.findByLanguageAndCategory(
          language,
          category,
        );

        expect(result[0].category).toBe(category);
      }
    });

    it('should return markers ordered by key', async () => {
      const language = 'en';
      const category = 'lipids';
      const markers = [
        mockMarker,
        { ...mockMarker, id: '2', name: 'hdl', key: 'hdl' },
        { ...mockMarker, id: '3', name: 'ldl', key: 'ldl' },
      ];

      service.findByLanguageAndCategory.mockResolvedValue(markers);

      const result = await controller.findByLanguageAndCategory(
        language,
        category,
      );

      expect(result).toHaveLength(3);
      expect(result.every((m) => m.category === category)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a single marker by id', async () => {
      const id = '1';
      service.findOne.mockResolvedValue(mockMarker);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockMarker);
      expect(result.id).toBe(id);
    });

    it('should throw NotFoundException when marker not found', async () => {
      const id = '999';
      service.findOne.mockRejectedValue(
        new Error('Marker with ID 999 not found'),
      );

      await expect(controller.findOne(id)).rejects.toThrow(
        'Marker with ID 999 not found',
      );
    });

    it('should handle UUID format ids', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      service.findOne.mockResolvedValue({ ...mockMarker, id: uuid });

      const result = await controller.findOne(uuid);

      expect(result.id).toBe(uuid);
    });

    it('should find markers with different ids', async () => {
      const ids = ['1', '2', '3', '4', '5'];

      for (const id of ids) {
        service.findOne.mockResolvedValue({ ...mockMarker, id });

        const result = await controller.findOne(id);

        expect(result.id).toBe(id);
      }
    });
  });

  describe('update', () => {
    it('should update marker pattern', async () => {
      const id = '1';
      const updateDto: UpdateMarkerDto = {
        pattern: 'NewPattern[:\\s]*([\\d.,]+)',
      };
      const updatedMarker = { ...mockMarker, ...updateDto };
      service.update.mockResolvedValue(updatedMarker);

      const result = await controller.update(id, updateDto);

      expect(service.update).toHaveBeenCalledWith(id, updateDto);
      expect(result.pattern).toBe(updateDto.pattern);
    });

    it('should update alternative names', async () => {
      const id = '1';
      const updateDto: UpdateMarkerDto = {
        alternativeNames: 'New Name 1,New Name 2',
      };
      const updatedMarker = { ...mockMarker, ...updateDto };
      service.update.mockResolvedValue(updatedMarker);

      const result = await controller.update(id, updateDto);

      expect(result.alternativeNames).toBe(updateDto.alternativeNames);
    });

    it('should update reference ranges', async () => {
      const id = '1';
      const updateDto: UpdateMarkerDto = {
        referenceMin: 2.5,
        referenceMax: 6.0,
      };
      const updatedMarker = { ...mockMarker, ...updateDto };
      service.update.mockResolvedValue(updatedMarker);

      const result = await controller.update(id, updateDto);

      expect(result.referenceMin).toBe(2.5);
      expect(result.referenceMax).toBe(6.0);
    });

    it('should update isActive status', async () => {
      const id = '1';
      const updateDto: UpdateMarkerDto = {
        isActive: false,
      };
      const updatedMarker = { ...mockMarker, isActive: false };
      service.update.mockResolvedValue(updatedMarker);

      const result = await controller.update(id, updateDto);

      expect(result.isActive).toBe(false);
    });

    it('should update multiple fields at once', async () => {
      const id = '1';
      const updateDto: UpdateMarkerDto = {
        pattern: 'UpdatedPattern[:\\s]*([\\d.,]+)',
        referenceMin: 1.0,
        referenceMax: 10.0,
        isActive: false,
      };
      const updatedMarker = { ...mockMarker, ...updateDto };
      service.update.mockResolvedValue(updatedMarker);

      const result = await controller.update(id, updateDto);

      expect(result.pattern).toBe(updateDto.pattern);
      expect(result.referenceMin).toBe(1.0);
      expect(result.referenceMax).toBe(10.0);
      expect(result.isActive).toBe(false);
    });

    it('should handle update errors', async () => {
      const id = '1';
      const updateDto: UpdateMarkerDto = { pattern: 'test' };
      service.update.mockRejectedValue(new Error('Update failed'));

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('remove', () => {
    it('should delete a marker', async () => {
      const id = '1';
      service.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('should throw error when deleting non-existent marker', async () => {
      const id = '999';
      service.remove.mockRejectedValue(
        new Error('Marker with ID 999 not found'),
      );

      await expect(controller.remove(id)).rejects.toThrow(
        'Marker with ID 999 not found',
      );
    });

    it('should delete multiple markers sequentially', async () => {
      const ids = ['1', '2', '3'];
      service.remove.mockResolvedValue(undefined);

      for (const id of ids) {
        await controller.remove(id);
        expect(service.remove).toHaveBeenCalledWith(id);
      }

      expect(service.remove).toHaveBeenCalledTimes(3);
    });
  });

  describe('receiveData', () => {
    it('should receive and process review data', () => {
      const reviewData: CreateReviewDataDto = {
        birthYear: 2000,
        gender: 'male',
        pregnancy: null,
        markersData: [
          {
            id: 1,
            name: 'Bilirubin (Total)',
            value: '4.8',
            unit: 'mg/dL',
            normalRange: '0.1 - 1.2 mg/dL',
            hasError: false,
          },
        ],
        nutritionAdvice: true,
        supplementRecommendations: false,
        medicationGuidance: false,
        exerciseGuidelines: false,
        additionalQuestions: undefined,
      };

      service.receiveData.mockReturnValue(reviewData);

      const result = controller.receiveData(reviewData);

      expect(service.receiveData).toHaveBeenCalledWith(reviewData);
      expect(result).toEqual(reviewData);
      expect(result.markersData).toHaveLength(1);
    });

    it('should handle review data with pregnancy status', () => {
      const reviewData: CreateReviewDataDto = {
        birthYear: 1990,
        gender: 'female',
        pregnancy: 'pregnant',
        markersData: [],
        nutritionAdvice: true,
      };

      service.receiveData.mockReturnValue(reviewData);

      const result = controller.receiveData(reviewData);

      expect(result.pregnancy).toBe('pregnant');
    });

    it('should handle review data with multiple markers', () => {
      const multiMarkerData: CreateReviewDataDto = {
        birthYear: 1985,
        gender: 'male',
        markersData: [
          {
            id: 1,
            name: 'Cholesterol',
            value: '5.2',
            unit: 'mmol/L',
            normalRange: '3.0 - 5.2 mmol/L',
            hasError: false,
          },
          {
            id: 2,
            name: 'Glucose',
            value: '95',
            unit: 'mg/dL',
            normalRange: '70 - 100 mg/dL',
            hasError: false,
          },
        ],
        nutritionAdvice: true,
        supplementRecommendations: true,
      };

      service.receiveData.mockReturnValue(multiMarkerData);

      const result = controller.receiveData(multiMarkerData);

      expect(result.markersData).toHaveLength(2);
      expect(result.markersData[0].name).toBe('Cholesterol');
      expect(result.markersData[1].name).toBe('Glucose');
    });

    it('should handle all optional recommendation flags', () => {
      const fullData: CreateReviewDataDto = {
        birthYear: 1995,
        gender: 'female',
        markersData: [],
        nutritionAdvice: true,
        supplementRecommendations: true,
        medicationGuidance: true,
        exerciseGuidelines: true,
        additionalQuestions: 'Why is my cholesterol high?',
      };

      service.receiveData.mockReturnValue(fullData);

      const result = controller.receiveData(fullData);

      expect(result.nutritionAdvice).toBe(true);
      expect(result.supplementRecommendations).toBe(true);
      expect(result.medicationGuidance).toBe(true);
      expect(result.exerciseGuidelines).toBe(true);
      expect(result.additionalQuestions).toBe('Why is my cholesterol high?');
    });

    it('should handle markers with error flags', () => {
      const dataWithErrors: CreateReviewDataDto = {
        birthYear: 1980,
        gender: 'male',
        markersData: [
          {
            id: 1,
            name: 'Invalid Marker',
            value: 'N/A',
            unit: '',
            normalRange: '',
            hasError: true,
          },
        ],
      };

      service.receiveData.mockReturnValue(dataWithErrors);

      const result = controller.receiveData(dataWithErrors);

      expect(result.markersData[0].hasError).toBe(true);
    });

    it('should handle empty markers array', () => {
      const emptyData: CreateReviewDataDto = {
        birthYear: 2000,
        gender: 'male',
        markersData: [],
      };

      service.receiveData.mockReturnValue(emptyData);

      const result = controller.receiveData(emptyData);

      expect(result.markersData).toHaveLength(0);
    });
  });
});
