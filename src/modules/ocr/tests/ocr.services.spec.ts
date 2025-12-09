/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { OcrService } from '../ocr.service';
import { ConfigService } from '@nestjs/config';
import { MarkerService } from '@modules/marker/marker.service';
import { CreateOcrDto } from '../dto/create.dto';
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

    it('should merge blood test data from multiple pages correctly', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXS9Db250ZW50cyA0IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCAzMz4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMTAwIDcwMCBUZAooSGVsbG8gV29ybGQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAyMTggMDAwMDAgbgowMDAwMDAwMTY3IDAwMDAwIG4KMDAwMDAwMDAxNSAwMDAwMCBuCjAwMDAwMDAxMDEgMDAwMDAgbgowMDAwMDAwMjY3IDAwMDAwIG4KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozNTAKJSVFT0Y=',
      };

      const pdfMock = require('pdf-to-img');
      pdfMock.pdf.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('page1');
          yield Buffer.from('page2');
        },
      });

      const tesseract = require('tesseract.js');
      tesseract.createWorker
        .mockResolvedValueOnce({
          setParameters: jest.fn().mockResolvedValue(undefined),
          recognize: jest.fn().mockResolvedValue({
            data: { text: 'Cholesterol 5.2 mmol/L' },
          }),
          terminate: jest.fn().mockResolvedValue(undefined),
        })
        .mockResolvedValueOnce({
          setParameters: jest.fn().mockResolvedValue(undefined),
          recognize: jest.fn().mockResolvedValue({
            data: { text: 'Glucose 95 mg/dL' },
          }),
          terminate: jest.fn().mockResolvedValue(undefined),
        });

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
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

    it('should process multi-page PDF and merge results', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXS9Db250ZW50cyA0IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCAzMz4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMTAwIDcwMCBUZAooSGVsbG8gV29ybGQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAyMTggMDAwMDAgbgowMDAwMDAwMTY3IDAwMDAwIG4KMDAwMDAwMDAxNSAwMDAwMCBuCjAwMDAwMDAxMDEgMDAwMDAgbgowMDAwMDAwMjY3IDAwMDAwIG4KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozNTAKJSVFT0Y=',
      };

      const pdfMock = require('pdf-to-img');
      const mockImages = [
        Buffer.from('mock-image-page-1'),
        Buffer.from('mock-image-page-2'),
      ];

      pdfMock.pdf.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const img of mockImages) {
            yield img;
          }
        },
      });

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
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

    it('should detect Ukrainian language from text', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const tesseract = require('tesseract.js');
      tesseract.createWorker.mockResolvedValueOnce({
        setParameters: jest.fn().mockResolvedValue(undefined),
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Холестерин 5.2 ммоль/л Глюкоза 95' },
        }),
        terminate: jest.fn().mockResolvedValue(undefined),
      });

      const ukrainianMarkers = [
        { ...mockMarkers[0], language: 'uk' },
        { ...mockMarkers[1], language: 'uk' },
      ];

      markerService.findByLanguage.mockImplementation((lang) => {
        if (lang === 'uk') return Promise.resolve(ukrainianMarkers);
        return Promise.resolve(mockMarkers);
      });

      await service.create(createOcrDto);

      expect(markerService.findByLanguage).toHaveBeenCalledWith('uk');
    });

    it('should detect Polish language from text', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const tesseract = require('tesseract.js');
      tesseract.createWorker.mockResolvedValueOnce({
        setParameters: jest.fn().mockResolvedValue(undefined),
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Cholesterol 5.2 mmol Glukoza 95 Hemoglobina' },
        }),
        terminate: jest.fn().mockResolvedValue(undefined),
      });

      const polishMarkers = [
        { ...mockMarkers[0], language: 'pl' },
        { ...mockMarkers[1], language: 'pl' },
      ];

      markerService.findByLanguage.mockImplementation((lang) => {
        if (lang === 'pl') return Promise.resolve(polishMarkers);
        return Promise.resolve(mockMarkers);
      });

      await service.create(createOcrDto);

      expect(markerService.findByLanguage).toHaveBeenCalledWith('pl');
    });

    it('should handle errors when processing individual markers', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const badMarkers = [
        {
          ...mockMarkers[0],
          pattern: '(invalid[regex',
        },
        mockMarkers[1],
      ];

      markerService.findByLanguage.mockResolvedValue(badMarkers);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should normalize lipid values with decimal conversion', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const tesseract = require('tesseract.js');
      tesseract.createWorker.mockResolvedValueOnce({
        setParameters: jest.fn().mockResolvedValue(undefined),
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Cholesterol 520' },
        }),
        terminate: jest.fn().mockResolvedValue(undefined),
      });

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
      const cholesterol = result.find((r) => r.id === 'cholesterol');
      expect(cholesterol?.value).toBe(5.2);
    });

    it('should normalize biochem small values with decimal conversion', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const glucoseMarker = {
        ...mockMarkers[1],
        key: 'glucose',
      };

      const tesseract = require('tesseract.js');
      tesseract.createWorker.mockResolvedValueOnce({
        setParameters: jest.fn().mockResolvedValue(undefined),
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Glucose 950' },
        }),
        terminate: jest.fn().mockResolvedValue(undefined),
      });

      markerService.findByLanguage.mockResolvedValue([glucoseMarker]);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
      const glucose = result.find((r) => r.id === 'glucose');
      expect(glucose?.value).toBe(9.5);
    });

    it('should normalize lipid values with decimal conversion', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const tesseract = require('tesseract.js');
      tesseract.createWorker.mockResolvedValueOnce({
        setParameters: jest.fn().mockResolvedValue(undefined),
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Cholesterol 520' },
        }),
        terminate: jest.fn().mockResolvedValue(undefined),
      });

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
      const cholesterol = result.find((r) => r.id === 'cholesterol');
      expect(cholesterol?.value).toBe(5.2);
    });

    it('should normalize biochem small values with decimal conversion', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      };

      const glucoseMarker = {
        ...mockMarkers[1],
        key: 'glucose',
      };

      const tesseract = require('tesseract.js');
      tesseract.createWorker.mockResolvedValueOnce({
        setParameters: jest.fn().mockResolvedValue(undefined),
        recognize: jest.fn().mockResolvedValue({
          data: { text: 'Glucose 950' },
        }),
        terminate: jest.fn().mockResolvedValue(undefined),
      });

      markerService.findByLanguage.mockResolvedValue([glucoseMarker]);

      const result = await service.create(createOcrDto);

      expect(result).toBeDefined();
      const glucose = result.find((r) => r.id === 'glucose');
      expect(glucose?.value).toBe(9.5);
    });

    it('should cleanup PDF temporary page files', async () => {
      const createOcrDto: CreateOcrDto = {
        data: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXS9Db250ZW50cyA0IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCAzMz4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMTAwIDcwMCBUZAooSGVsbG8gV29ybGQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1szIDAgUl0+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmCjAwMDAwMDAyMTggMDAwMDAgbgowMDAwMDAwMTY3IDAwMDAwIG4KMDAwMDAwMDAxNSAwMDAwMCBuCjAwMDAwMDAxMDEgMDAwMDAgbgowMDAwMDAwMjY3IDAwMDAwIG4KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozNTAKJSVFT0Y=',
      };

      (fs.readdirSync as jest.Mock).mockReturnValue([
        'upload_123_abc_page1.png',
        'upload_123_abc_page2.png',
        'other_file.txt',
      ]);

      const pdfMock = require('pdf-to-img');
      pdfMock.pdf.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('page1');
        },
      });

      markerService.findByLanguage.mockResolvedValue(mockMarkers);

      await service.create(createOcrDto);

      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });
});
