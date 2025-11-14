/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { OcrService } from './ocr.service';
import { MarkerService } from '@modules/marker/marker.service';
import { Marker } from '@modules/marker/entities/marker.entity';

jest.mock('fs');
jest.mock('sharp');
jest.mock('tesseract.js');
jest.mock('pdf-to-img');

describe('OcrService', () => {
  let service: OcrService;
  let markerService: MarkerService;
  let configService: ConfigService;

  const mockMarkers: Marker[] = [
    {
      id: '1',
      key: 'hemoglobin',
      name: 'Hemoglobin',
      language: 'en',
      pattern: 'Hemoglobin[:\\s]+([\\d.,]+)',
      category: 'bloodAll',
      unit: 'g/L',
      referenceMin: 130,
      referenceMax: 160,
      isActive: true,
      alternativeNames: 'HGB,Hb',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      key: 'glucose',
      name: 'Glucose',
      language: 'en',
      pattern: 'Glucose[:\\s]+([\\d.,]+)',
      category: 'biochem',
      unit: 'mmol/L',
      referenceMin: 4.11,
      referenceMax: 5.89,
      isActive: true,
      alternativeNames: 'GLU',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'UPLOAD_DIR') return '/tmp/uploads';
              if (key === 'MAX_FILE_SIZE') return 31457280;
              return null;
            }),
          },
        },
        {
          provide: MarkerService,
          useValue: {
            findByLanguage: jest.fn().mockResolvedValue(mockMarkers),
          },
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);
    markerService = module.get<MarkerService>(MarkerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validBase64Image =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const validBase64Pdf =
      'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSCi9SZXNvdXJjZXMgPDwgL1Byb2NTZXQgWy9QREYgL1RleHRdID4+Cj4+CmVuZG9iago=';

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should throw BadRequestException for empty data', async () => {
      await expect(service.create({ data: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid base64 format', async () => {
      await expect(service.create({ data: 'invalid-data' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unsupported file type', async () => {
      const invalidData = 'data:application/xml;base64,PHRlc3Q+PC90ZXN0Pg==';
      await expect(service.create({ data: invalidData })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file size exceeds limit', async () => {
      const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(50000000);
      await expect(service.create({ data: largeBase64 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateAndDetectFileType', () => {
    it('should detect PNG file type', () => {
      const data = 'data:image/png;base64,abc123';
      const fileType = (service as any).validateAndDetectFileType(data);
      expect(fileType).toBe('png');
    });

    it('should detect JPG file type', () => {
      const data = 'data:image/jpg;base64,abc123';
      const fileType = (service as any).validateAndDetectFileType(data);
      expect(fileType).toBe('jpg');
    });

    it('should detect JPEG file type', () => {
      const data = 'data:image/jpeg;base64,abc123';
      const fileType = (service as any).validateAndDetectFileType(data);
      expect(fileType).toBe('jpeg');
    });

    it('should detect PDF file type', () => {
      const data = 'data:application/pdf;base64,abc123';
      const fileType = (service as any).validateAndDetectFileType(data);
      expect(fileType).toBe('pdf');
    });

    it('should throw error for unsupported file type', () => {
      const data = 'data:text/plain;base64,abc123';
      expect(() => (service as any).validateAndDetectFileType(data)).toThrow(
        BadRequestException,
      );
    });

    it('should throw error for empty data', () => {
      expect(() => (service as any).validateAndDetectFileType('')).toThrow(
        BadRequestException,
      );
    });
  });

  describe('detectLanguageFromText', () => {
    it('should detect English language', () => {
      const text =
        'Cholesterol: 5.2 mmol/L\nGlucose: 4.5 mmol/L\nHemoglobin: 145 g/L';
      const language = (service as any).detectLanguageFromText(text);
      expect(language).toBe('en');
    });

    it('should detect Ukrainian language', () => {
      const text =
        'Холестерин: 5.2 ммоль/л\nГлюкоза: 4.5 ммоль/л\nГемоглобін: 145 г/л';
      const language = (service as any).detectLanguageFromText(text);
      expect(language).toBe('uk');
    });

    it('should detect Polish language', () => {
      const text =
        'Cholesterol: 5.2 mmol/l\nGlukoza: 4.5 mmol/l\nHemoglobina: 145 g/l';
      const language = (service as any).detectLanguageFromText(text);
      expect(language).toBe('pl');
    });

    it('should default to English for unknown text', () => {
      const text = '12345 67890 abcdef';
      const language = (service as any).detectLanguageFromText(text);
      expect(language).toBe('en');
    });
  });

  describe('normalizeNumber', () => {
    it('should parse decimal number with dot', () => {
      const result = (service as any).normalizeNumber('5.2', 'glucose');
      expect(result).toBe(5.2);
    });

    it('should parse decimal number with comma', () => {
      const result = (service as any).normalizeNumber('5,2', 'glucose');
      expect(result).toBe(5.2);
    });

    it('should remove spaces from number', () => {
      const result = (service as any).normalizeNumber('5 . 2', 'glucose');
      expect(result).toBe(5.2);
    });

    it('should convert lipid values (divide by 100 if >= 10)', () => {
      const result = (service as any).normalizeNumber('520', 'cholesterol');
      expect(result).toBe(5.2);
    });

    it('should not convert small lipid values', () => {
      const result = (service as any).normalizeNumber('5', 'cholesterol');
      expect(result).toBe(5);
    });

    it('should convert glucose values (divide by 100 if >= 100)', () => {
      const result = (service as any).normalizeNumber('450', 'glucose');
      expect(result).toBe(4.5);
    });

    it('should not convert small glucose values', () => {
      const result = (service as any).normalizeNumber('50', 'glucose');
      expect(result).toBe(50);
    });

    it('should handle hemoglobin values without conversion', () => {
      const result = (service as any).normalizeNumber('145', 'hemoglobin');
      expect(result).toBe(145);
    });
  });

  describe('parseBloodTestWithMarkers', () => {
    it('should extract markers from text', () => {
      const text = 'Hemoglobin: 145 g/L\nGlucose: 5.2 mmol/L';
      const result = (service as any).parseBloodTestWithMarkers(
        text,
        mockMarkers,
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'hemoglobin',
        name: 'Hemoglobin',
        value: 145,
        unit: 'g/L',
        referenceMin: 130,
        referenceMax: 160,
      });
      expect(result[1]).toEqual({
        id: 'glucose',
        name: 'Glucose',
        value: 5.2,
        unit: 'mmol/L',
        referenceMin: 4.11,
        referenceMax: 5.89,
      });
    });

    it('should return empty array when no markers match', () => {
      const text = 'Random text without markers';
      const result = (service as any).parseBloodTestWithMarkers(
        text,
        mockMarkers,
      );
      expect(result).toHaveLength(0);
    });

    it('should handle malformed marker patterns gracefully', () => {
      const badMarker = {
        ...mockMarkers[0],
        pattern: '[invalid(pattern',
      };
      const text = 'Hemoglobin: 145 g/L';

      const result = (service as any).parseBloodTestWithMarkers(text, [
        badMarker,
      ]);
      expect(result).toHaveLength(0);
    });
  });

  describe('mergeBloodTestData', () => {
    it('should merge multiple blood test data arrays', () => {
      const data1 = [
        {
          id: 'hemoglobin',
          name: 'Hemoglobin',
          value: 145,
          unit: 'g/L',
          referenceMin: '130',
          referenceMax: '160',
        },
      ];
      const data2 = [
        {
          id: 'glucose',
          name: 'Glucose',
          value: 5.2,
          unit: 'mmol/L',
          referenceMin: '4.11',
          referenceMax: '5.89',
        },
      ];

      const result = (service as any).mergeBloodTestData([data1, data2]);
      expect(result).toHaveLength(2);
    });

    it('should overwrite duplicate markers with last occurrence', () => {
      const data1 = [
        {
          id: 'hemoglobin',
          name: 'Hemoglobin',
          value: 145,
          unit: 'g/L',
          referenceMin: '130',
          referenceMax: '160',
        },
      ];
      const data2 = [
        {
          id: 'hemoglobin',
          name: 'Hemoglobin',
          value: 150,
          unit: 'g/L',
          referenceMin: '130',
          referenceMax: '160',
        },
      ];

      const result = (service as any).mergeBloodTestData([data1, data2]);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(150);
    });

    it('should handle empty arrays', () => {
      const result = (service as any).mergeBloodTestData([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('validateBase64Input', () => {
    it('should not throw for valid base64 image', () => {
      const validData = 'data:image/png;base64,iVBORw0KGgo=';
      expect(() =>
        (service as any).validateBase64Input(validData),
      ).not.toThrow();
    });

    it('should not throw for valid base64 PDF', () => {
      const validData = 'data:application/pdf;base64,JVBERi0=';
      expect(() =>
        (service as any).validateBase64Input(validData),
      ).not.toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => (service as any).validateBase64Input('')).toThrow(
        BadRequestException,
      );
    });

    it('should throw for whitespace only', () => {
      expect(() => (service as any).validateBase64Input('   ')).toThrow(
        BadRequestException,
      );
    });

    it('should throw for invalid format', () => {
      expect(() => (service as any).validateBase64Input('not-base64')).toThrow(
        BadRequestException,
      );
    });
  });
});
