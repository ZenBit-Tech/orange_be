/* eslint-disable */

jest.mock('pdf-to-img', () => ({
  pdf: jest.fn(),
}));
import { Test, TestingModule } from '@nestjs/testing';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { CreateOcrDto } from './dto/create.dto';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('OcrController', () => {
  let controller: OcrController;
  let service: jest.Mocked<OcrService>;

  const mockOcrService = {
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OcrController],
      providers: [
        { provide: OcrService, useValue: mockOcrService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<OcrController>(OcrController);
    service = module.get(OcrService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should extract text from image and return blood test data', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'image/png;base64,iVBORw0KGgoAAAANS...',
      };

      const mockBloodTestData: BloodTestData = [
        {
          id: '1',
          name: 'Hemoglobin',
          value: 15.5,
          unit: 'g/dL',
          referenceMin: 13,
          referenceMax: 17,
        },
      ];

      service.create.mockResolvedValue(mockBloodTestData);

      const result = await controller.create(createOcrDto);

      expect(service.create).toHaveBeenCalledWith(createOcrDto);
      expect(result).toEqual(mockBloodTestData);
    });

    it('should handle empty blood test data', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'image/png;base64,emptyImageData',
      };

      service.create.mockResolvedValue([]);

      const result = await controller.create(createOcrDto);

      expect(result).toEqual([]);
    });

    it('should handle multiple markers', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'image/png;base64,multipleMarkersData',
      };

      const mockBloodTestData: BloodTestData = [
        {
          id: '1',
          name: 'Hemoglobin',
          value: 15.5,
          unit: 'g/dL',
          referenceMin: 13,
          referenceMax: 17,
        },
        {
          id: '2',
          name: 'Glucose',
          value: 95,
          unit: 'mg/dL',
          referenceMin: 70,
          referenceMax: 100,
        },
      ];

      service.create.mockResolvedValue(mockBloodTestData);

      const result = await controller.create(createOcrDto);

      expect(result).toHaveLength(2);
    });

    it('should handle OCR service errors', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'image/png;base64,corruptedData',
      };

      service.create.mockRejectedValue(new Error('OCR processing failed'));

      await expect(controller.create(createOcrDto)).rejects.toThrow(
        'OCR processing failed',
      );
    });

    it('should handle invalid image format', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'invalid-data',
      };

      service.create.mockRejectedValue(new Error('Invalid image format'));

      await expect(controller.create(createOcrDto)).rejects.toThrow(
        'Invalid image format',
      );
    });
  });
});
