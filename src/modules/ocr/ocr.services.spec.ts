import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { OcrService } from './orc.service';

jest.mock('@modules/ocr', () => ({
  extractBloodTestData: jest.fn(),
}));

import { extractBloodTestData } from '@modules/ocr';

describe('OcrService', () => {
  let service: OcrService;
  const mockUploadDir = '/tmp/test-uploads';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcrService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'UPLOAD_DIR') return mockUploadDir;
              if (key === 'MAX_FILE_SIZE') return 5242880; // 5MB
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<OcrService>(OcrService);

    if (fs.existsSync(mockUploadDir)) {
      fs.rmSync(mockUploadDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    jest.clearAllMocks();

    if (fs.existsSync(mockUploadDir)) {
      fs.rmSync(mockUploadDir, { recursive: true, force: true });
    }
  });

  describe('create', () => {
    const validBase64Image =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const validBase64Data = `data:image/png;base64,${validBase64Image}`;

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should successfully process valid base64 image', async () => {
      const mockBloodTestData = {
        patientInfo: { age: 30 },
        lipids: { cholesterol: 5.2 },
        bloodCount: { differential: {} },
        biochemistry: {},
        kidneyFunction: {},
        all: { age: 30, cholesterol: 5.2 },
      };

      (extractBloodTestData as jest.Mock).mockResolvedValue(mockBloodTestData);

      const result = await service.create({ data: validBase64Data });

      expect(result).toEqual(mockBloodTestData);
      expect(extractBloodTestData).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid base64 format - missing semicolon', async () => {
      const invalidData = 'data:image/pngbase64,invaliddata';

      await expect(service.create({ data: invalidData })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for invalid base64 format - wrong structure', async () => {
      const invalidData = 'not;valid;base64;format';

      await expect(service.create({ data: invalidData })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error for empty data', async () => {
      await expect(service.create({ data: '' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create upload directory if it does not exist', async () => {
      const mockBloodTestData = {
        patientInfo: {},
        lipids: {},
        bloodCount: { differential: {} },
        biochemistry: {},
        kidneyFunction: {},
        all: {},
      };

      (extractBloodTestData as jest.Mock).mockResolvedValue(mockBloodTestData);

      await service.create({ data: validBase64Data });

      expect(fs.existsSync(mockUploadDir)).toBe(true);
    });

    it('should save file to correct path', async () => {
      const mockBloodTestData = {
        patientInfo: {},
        lipids: {},
        bloodCount: { differential: {} },
        biochemistry: {},
        kidneyFunction: {},
        all: {},
      };

      (extractBloodTestData as jest.Mock).mockResolvedValue(mockBloodTestData);

      await service.create({ data: validBase64Data });

      const files = fs.readdirSync(mockUploadDir);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/^[\w-]+\.png$/);
    });

    it('should clean up temporary files after processing', async () => {
      const mockBloodTestData = {
        patientInfo: {},
        lipids: {},
        bloodCount: { differential: {} },
        biochemistry: {},
        kidneyFunction: {},
        all: {},
      };

      (extractBloodTestData as jest.Mock).mockResolvedValue(mockBloodTestData);

      await service.create({ data: validBase64Data });

      const files = fs.readdirSync(mockUploadDir);
      const cleanedFiles = files.filter((f) => f.includes('_clean.png'));
      const ocrFiles = files.filter((f) => f.includes('_ocr_raw.txt'));

      expect(cleanedFiles.length).toBe(0);
      expect(ocrFiles.length).toBe(0);
    });

    it('should handle OCR extraction errors gracefully', async () => {
      (extractBloodTestData as jest.Mock).mockRejectedValue(
        new Error('OCR processing failed'),
      );

      await expect(service.create({ data: validBase64Data })).rejects.toThrow(
        'Failed to extract blood test data',
      );
    });

    it('should handle file system errors gracefully', async () => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('Disk full');
      });

      await expect(service.create({ data: validBase64Data })).rejects.toThrow();
    });

    it('should reject file exceeding size limit', async () => {
      const largeData = 'A'.repeat(7000000);
      const largeBase64Data = `data:image/png;base64,${largeData}`;

      await expect(service.create({ data: largeBase64Data })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate unique filenames for concurrent requests', async () => {
      const mockBloodTestData = {
        patientInfo: {},
        lipids: {},
        bloodCount: { differential: {} },
        biochemistry: {},
        kidneyFunction: {},
        all: {},
      };

      (extractBloodTestData as jest.Mock).mockResolvedValue(mockBloodTestData);

      await Promise.all([
        service.create({ data: validBase64Data }),
        service.create({ data: validBase64Data }),
        service.create({ data: validBase64Data }),
      ]);

      const files = fs.readdirSync(mockUploadDir);
      const uniqueFiles = new Set(files);

      expect(uniqueFiles.size).toBe(files.length);
    });
  });
});
