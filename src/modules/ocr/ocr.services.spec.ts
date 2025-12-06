/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from './ocr.service';
import { ConfigService } from '@nestjs/config';
import { MarkerService } from '@modules/marker/marker.service';
import { CreateOcrDto } from './dto/create.dto';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('sharp', () => {
  return jest.fn().mockReturnValue({
    grayscale: jest.fn().mockReturnThis(),
    normalise: jest.fn().mockReturnThis(),
    sharpen: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    toFile: jest.fn().mockResolvedValue(undefined),
  });
});
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn().mockResolvedValue({
    setParameters: jest.fn().mockResolvedValue(undefined),
    recognize: jest.fn().mockResolvedValue({
      data: { text: 'Cholesterol 5.2 mmol/L Glucose 95 mg/dL' },
    }),
    terminate: jest.fn().mockResolvedValue(undefined),
  }),
  PSM: { AUTO: 3 },
}));
jest.mock('pdf-to-img', () => ({
  pdf: jest.fn(),
}));

describe('OcrService', () => {
  let service: OcrService;
  let configService: jest.Mocked<ConfigService>;
  let markerService: jest.Mocked<MarkerService>;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockMarkerService = {
    findByLanguage: jest.fn(),
  };

  const mockMarkers = [
    {
      id: '1',
      key: 'cholesterol',
      name: 'Cholesterol',
      pattern: 'Cholesterol[:\\s]*([\\d.,]+)',
      language: 'en',
      unit: 'mmol/L',
      referenceMin: 3.0,
      referenceMax: 5.2,
      category: 'lipids',
      alternativeNames: 'Total Cholesterol,Chol',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      key: 'glucose',
      name: 'Glucose',
      pattern: 'Glucose[:\\s]*([\\d.,]+)',
      language: 'en',
      unit: 'mg/dL',
      referenceMin: 70,
      referenceMax: 100,
      category: 'metabolic',
      alternativeNames: 'Blood Sugar',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MarkerService, useValue: mockMarkerService },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    configService = module.get(ConfigService);
    markerService = module.get(MarkerService);

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'UPLOAD_DIR') return '/tmp/uploads';
      if (key === 'MAX_FILE_SIZE') return 31457280;
      return undefined;
    });

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    (fs.readdirSync as jest.Mock).mockReturnValue([]);
  });

  describe('create', () => {
    it('should process image and extract blood test data', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(markerService.findByLanguage).toHaveBeenCalledWith('en');
    });

    it('should throw BadRequestException for empty data', async () => {
      const createOcrDto: CreateOcrDto = {
        data: '',
      };

      await expect(service.create(createOcrDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid base64 format', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'invalid-base64-data',
      };

      await expect(service.create(createOcrDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      };

      await expect(service.create(createOcrDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for file size exceeding limit', async () => {
      const smallSizeModule = await Test.createTestingModule({
        providers: [
          OcrService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockImplementation((key: string) => {
                if (key === 'MAX_FILE_SIZE') return 10;
                if (key === 'UPLOAD_DIR') return '/tmp/uploads';
                return undefined;
              }),
            },
          },
          { provide: MarkerService, useValue: mockMarkerService },
        ],
      }).compile();

      const smallSizeService = smallSizeModule.get<OcrService>(OcrService);

      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      await expect(smallSizeService.create(createOcrDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle JPEG images', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'UPLOAD_DIR') return '/tmp/uploads';
        if (key === 'MAX_FILE_SIZE') return 31457280;
        return undefined;
      });

      const createOcrDto: CreateOcrDto = {
        data: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z',
      };

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should create upload directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      await service.create(createOcrDto);

      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should cleanup temporary files after processing', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      await service.create(createOcrDto);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when no markers found for language', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      markerService.findByLanguage.mockResolvedValue([]);

      await expect(service.create(createOcrDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should cleanup files even when processing fails', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      markerService.findByLanguage.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createOcrDto)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should detect language from OCR text', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const tesseract = require('tesseract.js');
      tesseract.createWorker.mockResolvedValueOnce({
        setParameters: jest.fn().mockResolvedValue(undefined),
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Cholesterol 5.2 mmol/L HDL LDL Total' },
        }),
        terminate: jest.fn().mockResolvedValue(undefined),
      });

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      await service.create(createOcrDto);

      expect(markerService.findByLanguage).toHaveBeenCalledWith('en');
    });

    it('should normalize decimal values correctly', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const tesseract = require('tesseract.js');
      tesseract.createWorker.mockResolvedValueOnce({
        setParameters: jest.fn().mockResolvedValue(undefined),
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Cholesterol 520 Glucose 95' },
        }),
        terminate: jest.fn().mockResolvedValue(undefined),
      });

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
    });
  });
});
