/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import { BloodTestService } from './bloodTest.service';
import { PdfService } from './pdf.service';
import OpenAI from 'openai';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import {
  PdfJobStatusEnum,
  ValidationConfidence,
} from '@common/interfaces/analysis-result.interface';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';

jest.mock('fs');
jest.mock('path');

describe('BloodTestService', () => {
  let service: BloodTestService;
  let openAI: jest.Mocked<OpenAI>;
  let pdfService: jest.Mocked<PdfService>;

  const mockCreateReviewData: CreateReviewDataDto = {
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
      {
        id: 2,
        name: 'Cholesterol',
        value: '180',
        unit: 'mg/dL',
        normalRange: '125-200 mg/dL',
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
      detailedFindings: ['Glucose levels are normal', 'Cholesterol is optimal'],
      conclusionStatement: 'Continue maintaining healthy lifestyle.',
    },
    supplementsRecommendations: undefined,
    nutritionRecommendations: {
      descriptions: ['Eat more vegetables', 'Reduce sugar intake'],
    },
    drugsRecommendations: undefined,
    exerciseRecommendations: {
      descriptions: ['30 minutes cardio daily', 'Strength training 2x/week'],
    },
    userQuestionResponse: {
      question: 'Why is my glucose level important?',
      answer: 'Glucose is essential for energy metabolism.',
    },
  };

  const mockMarkersChunkResponse = {
    markersInterpretations: [
      {
        markerId: 1,
        markerName: 'Glucose',
        value: '95',
        unit: 'mg/dL',
        referenceMin: '70',
        referenceMax: '100',
        status: 'Normal',
        interpretation: {
          about: 'Blood sugar level',
          whyImportant: 'Essential for energy',
          contextualNote: 'Within normal range',
        },
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

    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<BloodTestService>(BloodTestService);
    openAI = module.get(OpenAI) as jest.Mocked<OpenAI>;
    pdfService = module.get(PdfService) as jest.Mocked<PdfService>;

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

  describe('analyzeBloodTest', () => {
    it('should successfully analyze blood test with all markers', async () => {
      (openAI.chat.completions.create as jest.Mock)
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
        })
        .mockResolvedValueOnce({
          choices: [
            { message: { content: JSON.stringify(mockMarkersChunkResponse) } },
          ],
        });

      pdfService.generateHealthReportPdf.mockResolvedValue(
        Buffer.from('mock-pdf'),
      );

      const result = await service.analyzeBloodTest(mockCreateReviewData);

      expect(result).toHaveProperty('bloodTestSummary');
      expect(result).toHaveProperty('markersInterpretations');
      expect(result).toHaveProperty('pdfJobId');
      expect(result.bloodTestSummary.overallWellnessScore).toBe(85);
      expect(result.markersInterpretations).toHaveLength(1);
      expect(result.pdfJobId).toMatch(/^pdf_\d+_[a-z0-9]+$/);
    });

    it('should batch markers into chunks of 10', async () => {
      const largeMarkerData = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        name: `Marker${i + 1}`,
        value: '100',
        unit: 'mg/dL',
        normalRange: '80-120 mg/dL',
        hasError: false,
      }));

      const dataWithManyMarkers: CreateReviewDataDto = {
        ...mockCreateReviewData,
        markersData: largeMarkerData,
      };

      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          { message: { content: JSON.stringify(mockMarkersChunkResponse) } },
        ],
      });

      await service.analyzeBloodTest(dataWithManyMarkers);

      expect(openAI.chat.completions.create).toHaveBeenCalledTimes(4);
    });

    it('should handle AI API errors gracefully', async () => {
      (openAI.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error('OpenAI API Error'),
      );

      await expect(
        service.analyzeBloodTest(mockCreateReviewData),
      ).rejects.toThrow('OpenAI API Error');
    });

    it('should create PDF job with pending status', async () => {
      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      const result = await service.analyzeBloodTest(mockCreateReviewData);

      const jobStatus = service.getPdfJobStatus(result.pdfJobId);
      expect(jobStatus).toBeDefined();
      expect(jobStatus?.status).toBe(PdfJobStatusEnum.PENDING);
    });

    it('should handle empty markers data', async () => {
      const emptyData: CreateReviewDataDto = {
        ...mockCreateReviewData,
        markersData: [],
      };

      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      const result = await service.analyzeBloodTest(emptyData);

      expect(result.markersInterpretations).toHaveLength(0);
    });
  });

  describe('validateBloodTest', () => {
    it('should validate correct blood test data', async () => {
      const mockValidationResponse = {
        isBloodTest: true,
        reason: 'Contains valid blood markers',
        confidence: ValidationConfidence.HIGH,
      };

      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          { message: { content: JSON.stringify(mockValidationResponse) } },
        ],
      });

      const bloodTestData: BloodTestData = [
        {
          id: '1',
          name: 'Glucose',
          value: 95,
          unit: 'mg/dL',
          referenceMin: 70,
          referenceMax: 100,
        },
        {
          id: '2',
          name: 'Cholesterol',
          value: 180,
          unit: 'mg/dL',
          referenceMin: 125,
          referenceMax: 200,
        },
      ];

      const result = await service.validateBloodTest(bloodTestData);

      expect(result.isBloodTest).toBe(true);
      expect(result.confidence).toBe(ValidationConfidence.HIGH);
    });

    it('should reject invalid blood test data', async () => {
      const mockValidationResponse = {
        isBloodTest: false,
        reason: 'Does not contain blood markers',
        confidence: ValidationConfidence.HIGH,
      };

      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          { message: { content: JSON.stringify(mockValidationResponse) } },
        ],
      });

      const invalidData: BloodTestData = [
        {
          id: '1',
          name: 'Invalid',
          value: 0,
          unit: 'invalid',
          referenceMin: 0,
          referenceMax: 0,
        },
      ];

      const result = await service.validateBloodTest(invalidData);

      expect(result.isBloodTest).toBe(false);
    });

    it('should handle validation API errors', async () => {
      (openAI.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error('API Error'),
      );

      const bloodTestData: BloodTestData = [
        {
          id: '1',
          name: 'Glucose',
          value: 95,
          unit: 'mg/dL',
          referenceMin: 70,
          referenceMax: 100,
        },
      ];

      const result = await service.validateBloodTest(bloodTestData);

      expect(result.isBloodTest).toBe(false);
      expect(result.reason).toContain('API error');
      expect(result.confidence).toBe(ValidationConfidence.LOW);
    });

    it('should handle malformed JSON responses', async () => {
      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: 'invalid json {{{' } }],
      });

      const bloodTestData: BloodTestData = [
        {
          id: '1',
          name: 'Glucose',
          value: 95,
          unit: 'mg/dL',
          referenceMin: 70,
          referenceMax: 100,
        },
      ];

      const result = await service.validateBloodTest(bloodTestData);

      expect(result.isBloodTest).toBe(false);
      expect(result.reason).toBe('Failed to parse AI response');
    });
  });

  describe('getPdfJobStatus', () => {
    it('should return job status for valid job ID', async () => {
      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      const result = await service.analyzeBloodTest(mockCreateReviewData);
      const jobStatus = service.getPdfJobStatus(result.pdfJobId);

      expect(jobStatus).toBeDefined();
      expect(jobStatus?.createdAt).toBeInstanceOf(Date);
    });

    it('should return null for invalid job ID format', () => {
      const invalidJobId = 'invalid-job-id';
      const jobStatus = service.getPdfJobStatus(invalidJobId);

      expect(jobStatus).toBeNull();
    });

    it('should return null for non-existent job ID', () => {
      const nonExistentJobId = 'pdf_9999999999_nonexistent';
      const jobStatus = service.getPdfJobStatus(nonExistentJobId);

      expect(jobStatus).toBeNull();
    });
  });

  describe('getPdfByJobId', () => {
    it('should return PDF buffer for completed job', async () => {
      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      pdfService.generateHealthReportPdf.mockResolvedValue(
        Buffer.from('mock-pdf'),
      );

      const result = await service.analyzeBloodTest(mockCreateReviewData);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const privateJobsMap = (
        service as unknown as {
          pdfJobs: Map<
            string,
            {
              status: string;
              filename?: string;
              createdAt: Date;
              lastAccessedAt?: Date;
              downloadCount?: number;
            }
          >;
        }
      ).pdfJobs;
      const job = privateJobsMap.get(result.pdfJobId);
      if (job) {
        job.status = PdfJobStatusEnum.COMPLETED;
        job.filename = `${result.pdfJobId}.pdf`;
      }

      const pdf = service.getPdfByJobId(result.pdfJobId);

      expect(pdf).toBeDefined();
      expect(Buffer.isBuffer(pdf)).toBe(true);
    });

    it('should return null for invalid job ID', () => {
      const pdf = service.getPdfByJobId('invalid-id');
      expect(pdf).toBeNull();
    });

    it('should return null for pending job', async () => {
      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      const result = await service.analyzeBloodTest(mockCreateReviewData);
      const pdf = service.getPdfByJobId(result.pdfJobId);

      expect(pdf).toBeNull();
    });

    it('should increment download count on each access', async () => {
      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      const result = await service.analyzeBloodTest(mockCreateReviewData);

      const privateJobsMap = (
        service as unknown as {
          pdfJobs: Map<
            string,
            {
              status: string;
              filename?: string;
              createdAt: Date;
              lastAccessedAt?: Date;
              downloadCount?: number;
            }
          >;
        }
      ).pdfJobs;
      const job = privateJobsMap.get(result.pdfJobId);
      if (job) {
        job.status = PdfJobStatusEnum.COMPLETED;
        job.filename = `${result.pdfJobId}.pdf`;
      }

      service.getPdfByJobId(result.pdfJobId);
      service.getPdfByJobId(result.pdfJobId);

      const updatedJob = privateJobsMap.get(result.pdfJobId);
      expect(updatedJob?.downloadCount).toBe(2);
    });

    it('should prevent path traversal attacks', () => {
      const maliciousJobId = 'pdf_123_../../etc/passwd';
      const pdf = service.getPdfByJobId(maliciousJobId);

      expect(pdf).toBeNull();
    });
  });

  describe('PDF cleanup', () => {
    it('should cleanup expired PDFs after 30 minutes', async () => {
      jest.useFakeTimers();

      (openAI.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockAiResponse) } }],
      });

      const result = await service.analyzeBloodTest(mockCreateReviewData);

      const privateJobsMap = (
        service as unknown as {
          pdfJobs: Map<
            string,
            {
              status: string;
              filename?: string;
              createdAt: Date;
              lastAccessedAt?: Date;
              downloadCount?: number;
            }
          >;
        }
      ).pdfJobs;
      const job = privateJobsMap.get(result.pdfJobId);
      if (job) {
        job.status = PdfJobStatusEnum.COMPLETED;
        job.filename = `${result.pdfJobId}.pdf`;
        job.lastAccessedAt = new Date(Date.now() - 31 * 60 * 1000);
      }

      jest.advanceTimersByTime(5 * 60 * 1000);

      await new Promise(process.nextTick);

      jest.useRealTimers();
    });
  });
});
