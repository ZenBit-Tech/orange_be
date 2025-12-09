/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import { BloodTestService } from '../bloodTest.service';
import { PdfService } from '../pdf.service';
import OpenAI from 'openai';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import {
  PdfJobStatusEnum,
  ValidationConfidence,
} from '@common/interfaces/analysis-result.interface';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';

jest.mock('fs');
jest.mock('path');

describe('BloodTestService - Additional Coverage', () => {
  let service;
  let openAI;
  let pdfService;

  const mockCreateReviewData = {
    birthYear: 1990,
    gender: 'male',
    pregnancy: null,
    markersData: [
      {
        id: 1,
        name: 'Glucose',
        value: '95',
        unit: 'mg/dL',
        normalRange: '70-100 mg/dL',
        hasError: false,
      },
    ],
    nutritionAdvice: true,
    supplementRecommendations: false,
    medicationGuidance: false,
    exerciseGuidelines: true,
    additionalQuestions: 'Why is my glucose level important?',
  };

  const mockAiResponse = {
    bloodTestSummary: {
      overallWellnessScore: 85,
      overallSummary: 'Your overall health is good.',
      detailedFindings: ['Glucose levels are normal'],
      conclusionStatement: 'Continue maintaining healthy lifestyle.',
    },
    markersInterpretations: [
      {
        markerId: 1,
        markerName: 'Glucose',
        value: '95',
        unit: 'mg/dL',
        status: 'Normal',
      },
    ],
  };

  beforeEach(async () => {
    const mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    const mockPdfService = {
      generateHealthReportPdf: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        BloodTestService,
        {
          provide: OpenAI,
          useValue: mockOpenAI,
        },
        {
          provide: PdfService,
          useValue: mockPdfService,
        },
      ],
    }).compile();

    service = module.get(BloodTestService);
    openAI = module.get(OpenAI);
    pdfService = module.get(PdfService);

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('mock-pdf'));
    (fs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.resolve as jest.Mock).mockImplementation((p) => p);
    (path.basename as jest.Mock).mockImplementation((p) => p);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('safeJsonParse utility - line 35', () => {
    it('should return fallback when parsed type does not match fallback type', () => {
      const { safeJsonParse } = require('../bloodTest.service');

      const result = safeJsonParse('"string value"', []);

      expect(result).toEqual([]);
    });
  });

  describe('getErrorMessage utility - lines 53-56', () => {
    it('should handle Error instance', async () => {
      (openAI.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error('Test error'),
      );

      await expect(
        service.analyzeBloodTest(mockCreateReviewData),
      ).rejects.toThrow('Test error');
    });

    it('should handle string error', async () => {
      (openAI.chat.completions.create as jest.Mock).mockRejectedValue(
        'String error',
      );

      await expect(
        service.analyzeBloodTest(mockCreateReviewData),
      ).rejects.toThrow('String error');
    });

    it('should handle unknown error type in PDF generation', async () => {
      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      pdfService.generateHealthReportPdf.mockRejectedValue({
        code: 'UNKNOWN',
      });

      const result = await service.analyzeBloodTest(mockCreateReviewData);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const jobStatus = service.getPdfJobStatus(result.pdfJobId);
      expect(jobStatus.error).toBe('Unknown error');
    });
  });

  describe('analyzeBloodTest - garbage collection line 95', () => {
    it('should call global.gc if available', async () => {
      global.gc = jest.fn();

      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      await service.analyzeBloodTest(mockCreateReviewData);

      expect(global.gc).toHaveBeenCalled();

      delete global.gc;
    });
  });

  describe('markersInterpretations handling - line 142', () => {
    it('should handle non-array markersInterpretations gracefully', async () => {
      const invalidResponse = {
        bloodTestSummary: mockAiResponse.bloodTestSummary,
      };

      const invalidChunkResponse = {
        markersInterpretations: 'not an array',
      };

      (openAI.chat.completions.create as jest.Mock)
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(invalidResponse) } }],
        })
        .mockResolvedValueOnce({
          choices: [
            { message: { content: JSON.stringify(invalidChunkResponse) } },
          ],
        });

      const result = await service.analyzeBloodTest(mockCreateReviewData);

      expect(result.markersInterpretations).toEqual([]);
    });
  });

  describe('PDF generation background process - lines 224-237', () => {
    it('should handle PDF generation errors and update job status', async () => {
      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      pdfService.generateHealthReportPdf.mockRejectedValue(
        new Error('PDF generation failed'),
      );

      const result = await service.analyzeBloodTest(mockCreateReviewData);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const jobStatus = service.getPdfJobStatus(result.pdfJobId);
      expect(jobStatus.status).toBe(PdfJobStatusEnum.FAILED);
      expect(jobStatus.error).toBe('PDF generation failed');
    });

    it('should handle unknown error type in PDF generation', async () => {
      jest.useFakeTimers();

      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      pdfService.generateHealthReportPdf.mockRejectedValue({
        code: 'UNKNOWN',
      });

      const result = await service.analyzeBloodTest(mockCreateReviewData);

      await jest.runAllImmediates();
      await new Promise(process.nextTick);

      const jobStatus = service.getPdfJobStatus(result.pdfJobId);
      expect(jobStatus.error).toBe('Unknown error');

      jest.useRealTimers();
    });

    it('should call gc after successful PDF generation if available', async () => {
      global.gc = jest.fn();

      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      pdfService.generateHealthReportPdf.mockResolvedValue(
        Buffer.from('mock-pdf'),
      );

      await service.analyzeBloodTest(mockCreateReviewData);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(global.gc).toHaveBeenCalled();

      delete global.gc;
    });
  });

  describe('ensureDirectoryExists - line 249', () => {
    it('should reject path traversal with different resolved paths', () => {
      const jobId = 'pdf_123_test';

      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.COMPLETED,
        filename: 'test.pdf',
        createdAt: new Date(),
      });

      (path.resolve as jest.Mock)
        .mockReturnValueOnce('/etc/passwd')
        .mockReturnValueOnce('/var/app/pdfs');

      const pdf = service.getPdfByJobId(jobId);

      expect(pdf).toBeNull();
    });
  });

  describe('getPdfByJobId - path traversal prevention lines 286-287', () => {
    it('should reject path traversal with different resolved paths', () => {
      const jobId = 'pdf_123_test';

      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.COMPLETED,
        filename: 'test.pdf',
        createdAt: new Date(),
      });

      (path.resolve as jest.Mock)
        .mockReturnValueOnce('/var/app/pdfs/../../../etc/passwd')
        .mockReturnValueOnce('/var/app/pdfs');

      const pdf = service.getPdfByJobId(jobId);

      expect(pdf).toBeNull();
    });
  });

  describe('deletePdf - lines 307-367', () => {
    it('should delete PDF file and remove from cache', () => {
      const jobId = 'pdf_123_test';

      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.COMPLETED,
        filename: 'test.pdf',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      });

      const deletePdfMethod = (service as any).deletePdf.bind(service);
      deletePdfMethod(jobId);

      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(privateJobsMap.has(jobId)).toBe(false);
    });

    it('should handle path traversal in delete operation', () => {
      const jobId = 'pdf_123_test';

      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.COMPLETED,
        filename: '../../../etc/passwd',
        createdAt: new Date(),
      });

      (path.resolve as jest.Mock)
        .mockReturnValueOnce('/etc/passwd')
        .mockReturnValueOnce('/var/app/pdfs');

      const deletePdfMethod = (service as any).deletePdf.bind(service);
      deletePdfMethod(jobId);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle file deletion errors gracefully', () => {
      const jobId = 'pdf_123_test';

      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.COMPLETED,
        filename: 'test.pdf',
        createdAt: new Date(),
      });

      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const deletePdfMethod = (service as any).deletePdf.bind(service);

      expect(() => deletePdfMethod(jobId)).not.toThrow();
    });

    it('should delete job from cache even if file does not exist', () => {
      const jobId = 'pdf_123_test';

      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.COMPLETED,
        filename: 'test.pdf',
        createdAt: new Date(),
      });

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const deletePdfMethod = (service as any).deletePdf.bind(service);
      deletePdfMethod(jobId);

      expect(privateJobsMap.has(jobId)).toBe(false);
    });

    it('should handle job without filename', () => {
      const jobId = 'pdf_123_test';

      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.PENDING,
        createdAt: new Date(),
      });

      const deletePdfMethod = (service as any).deletePdf.bind(service);
      deletePdfMethod(jobId);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
      expect(privateJobsMap.has(jobId)).toBe(false);
    });
  });

  describe('cleanupExpiredPdfs - gc call', () => {
    it('should call gc after cleanup if available and PDFs were cleaned', () => {
      global.gc = jest.fn();

      const jobId = 'pdf_123_old';
      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.COMPLETED,
        filename: 'old.pdf',
        createdAt: new Date(Date.now() - 31 * 60 * 1000),
        lastAccessedAt: new Date(Date.now() - 31 * 60 * 1000),
      });

      const cleanupMethod = (service as any).cleanupExpiredPdfs.bind(service);
      cleanupMethod();

      expect(global.gc).toHaveBeenCalled();

      delete global.gc;
    });

    it('should not call gc if no PDFs were cleaned', () => {
      global.gc = jest.fn();

      const cleanupMethod = (service as any).cleanupExpiredPdfs.bind(service);
      cleanupMethod();

      expect(global.gc).not.toHaveBeenCalled();

      delete global.gc;
    });
  });

  describe('getPdfByJobId - file read error handling', () => {
    it('should handle file read errors gracefully', () => {
      const jobId = 'pdf_123_test';

      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.COMPLETED,
        filename: 'test.pdf',
        createdAt: new Date(),
      });

      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      const pdf = service.getPdfByJobId(jobId);

      expect(pdf).toBeNull();
    });

    it('should return null when file does not exist', () => {
      const jobId = 'pdf_123_test';

      const privateJobsMap = (service as any).pdfJobs;
      privateJobsMap.set(jobId, {
        status: PdfJobStatusEnum.COMPLETED,
        filename: 'test.pdf',
        createdAt: new Date(),
      });

      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const pdf = service.getPdfByJobId(jobId);

      expect(pdf).toBeNull();
    });
  });
});
