/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { BloodTestController } from './bloodTest.controller';
import { BloodTestService } from './bloodTest.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import {
  PdfJobStatusEnum,
  AiAnalysisResult,
  PdfJobStatus,
} from '@common/interfaces/analysis-result.interface';
import type {
  BloodTestData,
  BloodTestValidation,
} from '@common/interfaces/blood-test-data.interface';

describe('BloodTestController', () => {
  let controller: BloodTestController;
  let service: jest.Mocked<BloodTestService>;

  const mockBloodTestService = {
    analyzeBloodTest: jest.fn(),
    validateBloodTest: jest.fn(),
    getPdfJobStatus: jest.fn(),
    getPdfByJobId: jest.fn(),
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
      controllers: [BloodTestController],
      providers: [
        { provide: BloodTestService, useValue: mockBloodTestService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<BloodTestController>(BloodTestController);
    service = module.get(BloodTestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    it('should analyze blood test successfully', async () => {
      const mockData: CreateReviewDataDto = {
        markersData: [
          {
            id: 1,
            name: 'Hemoglobin',
            value: '15.5',
            unit: 'g/dL',
            normalRange: '13-17 g/dL',
            hasError: false,
          },
        ],
        birthYear: 1990,
        gender: 'male',
      };

      const mockResult: AiAnalysisResult = {
        bloodTestSummary: {
          overallWellnessScore: 85,
          overallSummary: 'Your hemoglobin levels are within normal range.',
          detailedFindings: ['Hemoglobin normal', 'No concerns detected'],
          conclusionStatement: 'Overall health is good',
        },
        markersInterpretations: [
          {
            markerId: 1,
            markerName: 'Hemoglobin',
            value: '15.5',
            unit: 'g/dL',
            referenceMin: '13',
            referenceMax: '17',
            status: 'Normal',
            interpretation: {
              about: 'Hemoglobin carries oxygen',
              whyImportant: 'Essential for oxygen transport',
              contextualNote: 'Within healthy range',
            },
          },
        ],
        drugsRecommendations: {
          descriptions: [
            'Maintain current iron intake',
            'Continue regular exercise',
          ],
        },
        pdfJobId: 'pdf_123_abc',
      };

      service.analyzeBloodTest.mockResolvedValue(mockResult);

      const result = await controller.analyze(mockData);

      expect(service.analyzeBloodTest).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockResult);
      expect(result.pdfJobId).toBe('pdf_123_abc');
    });

    it('should handle multiple markers in analysis', async () => {
      const mockData: CreateReviewDataDto = {
        markersData: [
          {
            id: 1,
            name: 'Hemoglobin',
            value: '15.5',
            unit: 'g/dL',
            normalRange: '13-17 g/dL',
            hasError: false,
          },
          {
            id: 2,
            name: 'Glucose',
            value: '95',
            unit: 'mg/dL',
            normalRange: '70-100 mg/dL',
            hasError: false,
          },
          {
            id: 3,
            name: 'Cholesterol',
            value: '180',
            unit: 'mg/dL',
            normalRange: '125-200 mg/dL',
            hasError: false,
          },
        ],
        birthYear: 1990,
        gender: 'male',
      };

      const mockResult: AiAnalysisResult = {
        bloodTestSummary: {
          overallWellnessScore: 90,
          overallSummary: 'Overall health markers are good.',
          detailedFindings: ['All markers within range'],
          conclusionStatement: 'Continue healthy lifestyle',
        },
        markersInterpretations: [
          {
            markerId: 1,
            markerName: 'Hemoglobin',
            value: '15.5',
            unit: 'g/dL',
            referenceMin: '13',
            referenceMax: '17',
            status: 'Normal',
            interpretation: {
              about: 'Oxygen carrier',
              whyImportant: 'Essential',
              contextualNote: 'Normal',
            },
          },
        ],
        drugsRecommendations: {
          descriptions: ['Continue healthy lifestyle'],
        },
        pdfJobId: 'pdf_456',
      };

      service.analyzeBloodTest.mockResolvedValue(mockResult);

      const result = await controller.analyze(mockData);

      expect(result.drugsRecommendations?.descriptions).toHaveLength(1);
    });

    it('should handle errors during analysis', async () => {
      const mockData: CreateReviewDataDto = {
        markersData: [],
        birthYear: 1990,
        gender: 'male',
      };

      service.analyzeBloodTest.mockRejectedValue(new Error('Analysis failed'));

      await expect(controller.analyze(mockData)).rejects.toThrow(
        'Analysis failed',
      );
    });

    it('should handle AI service timeout', async () => {
      const mockData: CreateReviewDataDto = {
        markersData: [
          {
            id: 1,
            name: 'Test',
            value: '100',
            unit: 'mg/dL',
            normalRange: '0-100 mg/dL',
            hasError: false,
          },
        ],
        birthYear: 1990,
        gender: 'male',
      };

      service.analyzeBloodTest.mockRejectedValue(new Error('Timeout'));

      await expect(controller.analyze(mockData)).rejects.toThrow('Timeout');
    });
  });

  describe('isValid', () => {
    it('should validate blood test data successfully', async () => {
      const mockData: BloodTestData = [
        {
          id: '1',
          name: 'Glucose',
          value: 95,
          unit: 'mg/dL',
          referenceMin: 70,
          referenceMax: 100,
        },
      ];

      const mockValidation: BloodTestValidation = {
        isBloodTest: true,
        reason: 'Blood test data is valid',
        confidence: 'high',
      };

      service.validateBloodTest.mockResolvedValue(mockValidation);

      const result = await controller.isValid(mockData);

      expect(service.validateBloodTest).toHaveBeenCalledWith(mockData);
      expect(result).toEqual(mockValidation);
      expect(result.isBloodTest).toBe(true);
    });

    it('should return validation errors for invalid data', async () => {
      const mockData: BloodTestData = [];

      const mockValidation: BloodTestValidation = {
        isBloodTest: false,
        reason: 'No markers provided. Invalid data format.',
        confidence: 'high',
      };

      service.validateBloodTest.mockResolvedValue(mockValidation);

      const result = await controller.isValid(mockData);

      expect(result.isBloodTest).toBe(false);
      expect(result.reason).toContain('No markers provided');
    });

    it('should validate marker units', async () => {
      const mockData: BloodTestData = [
        {
          id: '1',
          name: 'Glucose',
          value: 95,
          unit: 'invalid-unit',
          referenceMin: 70,
          referenceMax: 100,
        },
      ];

      const mockValidation: BloodTestValidation = {
        isBloodTest: false,
        reason: 'Invalid unit format',
        confidence: 'medium',
      };

      service.validateBloodTest.mockResolvedValue(mockValidation);

      const result = await controller.isValid(mockData);

      expect(result.isBloodTest).toBe(false);
    });

    it('should handle validation warnings', async () => {
      const mockData: BloodTestData = [
        {
          id: '1',
          name: 'Glucose',
          value: 95,
          unit: 'mg/dL',
          referenceMin: 70,
          referenceMax: 100,
        },
      ];

      const mockValidation: BloodTestValidation = {
        isBloodTest: true,
        reason: 'Valid. Missing reference range for optimal analysis',
        confidence: 'medium',
      };

      service.validateBloodTest.mockResolvedValue(mockValidation);

      const result = await controller.isValid(mockData);

      expect(result.isBloodTest).toBe(true);
      expect(result.reason).toContain('Missing reference range');
    });
  });

  describe('getPdfStatus', () => {
    it('should return PDF job status when job exists', () => {
      const jobId = 'pdf_123_abc';
      const mockStatus: PdfJobStatus = {
        status: PdfJobStatusEnum.COMPLETED,
        createdAt: new Date(),
        filename: 'health-report.pdf',
      };

      service.getPdfJobStatus.mockReturnValue(mockStatus);

      const result = controller.getPdfStatus(jobId);

      expect(service.getPdfJobStatus).toHaveBeenCalledWith(jobId);
      expect(result).toEqual(mockStatus);
      expect(result.status).toBe(PdfJobStatusEnum.COMPLETED);
    });

    it('should throw NotFoundException when job does not exist', () => {
      const jobId = 'invalid_job';
      service.getPdfJobStatus.mockReturnValue(null);

      expect(() => controller.getPdfStatus(jobId)).toThrow(NotFoundException);
      expect(() => controller.getPdfStatus(jobId)).toThrow('PDF job not found');
    });

    it('should return pending status for ongoing generation', () => {
      const jobId = 'pdf_456_def';
      const mockStatus: PdfJobStatus = {
        status: PdfJobStatusEnum.PENDING,
        createdAt: new Date(),
      };

      service.getPdfJobStatus.mockReturnValue(mockStatus);

      const result = controller.getPdfStatus(jobId);

      expect(result.status).toBe(PdfJobStatusEnum.PENDING);
    });

    it('should return failed status with error message', () => {
      const jobId = 'pdf_789_ghi';
      const mockStatus: PdfJobStatus = {
        status: PdfJobStatusEnum.FAILED,
        error: 'PDF generation service unavailable',
        createdAt: new Date(),
      };

      service.getPdfJobStatus.mockReturnValue(mockStatus);

      const result = controller.getPdfStatus(jobId);

      expect(result.status).toBe(PdfJobStatusEnum.FAILED);
      expect(result.error).toBe('PDF generation service unavailable');
    });

    it('should handle status check for multiple jobs', () => {
      const jobIds = ['pdf_1', 'pdf_2', 'pdf_3'];
      const statuses = [
        PdfJobStatusEnum.COMPLETED,
        PdfJobStatusEnum.PENDING,
        PdfJobStatusEnum.FAILED,
      ];

      jobIds.forEach((jobId, index) => {
        const mockStatus: PdfJobStatus = {
          status: statuses[index],
          createdAt: new Date(),
        };

        service.getPdfJobStatus.mockReturnValue(mockStatus);

        const result = controller.getPdfStatus(jobId);
        expect(result.status).toBe(statuses[index]);
      });
    });
  });

  describe('downloadPdf', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockResponse = {
        set: jest.fn().mockReturnThis(),
        end: jest.fn(),
      };
    });

    it('should download PDF successfully when ready', () => {
      const jobId = 'pdf_123_abc';
      const mockPdfBuffer = Buffer.from('PDF content data');
      const mockStatus: PdfJobStatus = {
        status: PdfJobStatusEnum.COMPLETED,
        createdAt: new Date(),
      };

      service.getPdfJobStatus.mockReturnValue(mockStatus);
      service.getPdfByJobId.mockReturnValue(mockPdfBuffer);

      controller.downloadPdf(jobId, mockResponse as Response);

      expect(service.getPdfJobStatus).toHaveBeenCalledWith(jobId);
      expect(service.getPdfByJobId).toHaveBeenCalledWith(jobId);
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=health-report.pdf',
        'Content-Length': mockPdfBuffer.length,
      });
      expect(mockResponse.end).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('should throw NotFoundException when job does not exist', () => {
      const jobId = 'invalid_job';
      service.getPdfJobStatus.mockReturnValue(null);

      expect(() =>
        controller.downloadPdf(jobId, mockResponse as Response),
      ).toThrow(NotFoundException);
      expect(() =>
        controller.downloadPdf(jobId, mockResponse as Response),
      ).toThrow('PDF job not found');
    });

    it('should throw BadRequestException when PDF is still generating', () => {
      const jobId = 'pdf_pending';
      const mockStatus: PdfJobStatus = {
        status: PdfJobStatusEnum.PENDING,
        createdAt: new Date(),
      };

      service.getPdfJobStatus.mockReturnValue(mockStatus);

      expect(() =>
        controller.downloadPdf(jobId, mockResponse as Response),
      ).toThrow(BadRequestException);
      expect(() =>
        controller.downloadPdf(jobId, mockResponse as Response),
      ).toThrow('PDF is still being generated');
    });

    it('should throw BadRequestException when PDF generation failed', () => {
      const jobId = 'pdf_failed';
      const errorMessage = 'Out of memory error';
      const mockStatus: PdfJobStatus = {
        status: PdfJobStatusEnum.FAILED,
        error: errorMessage,
        createdAt: new Date(),
      };

      service.getPdfJobStatus.mockReturnValue(mockStatus);

      expect(() =>
        controller.downloadPdf(jobId, mockResponse as Response),
      ).toThrow(BadRequestException);
      expect(() =>
        controller.downloadPdf(jobId, mockResponse as Response),
      ).toThrow(`PDF generation failed: ${errorMessage}`);
    });

    it('should throw NotFoundException when PDF file is not found or expired', () => {
      const jobId = 'pdf_expired';
      const mockStatus: PdfJobStatus = {
        status: PdfJobStatusEnum.COMPLETED,
        createdAt: new Date(),
      };

      service.getPdfJobStatus.mockReturnValue(mockStatus);
      service.getPdfByJobId.mockReturnValue(null);

      expect(() =>
        controller.downloadPdf(jobId, mockResponse as Response),
      ).toThrow(NotFoundException);
      expect(() =>
        controller.downloadPdf(jobId, mockResponse as Response),
      ).toThrow('PDF file not found or expired');
    });

    it('should handle large PDF files', () => {
      const jobId = 'pdf_large';
      const largePdfBuffer = Buffer.alloc(5 * 1024 * 1024);
      const mockStatus: PdfJobStatus = {
        status: PdfJobStatusEnum.COMPLETED,
        createdAt: new Date(),
      };

      service.getPdfJobStatus.mockReturnValue(mockStatus);
      service.getPdfByJobId.mockReturnValue(largePdfBuffer);

      controller.downloadPdf(jobId, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Length': largePdfBuffer.length,
        }),
      );
    });

    it('should set correct headers for PDF download', () => {
      const jobId = 'pdf_headers_test';
      const mockPdfBuffer = Buffer.from('test');
      const mockStatus: PdfJobStatus = {
        status: PdfJobStatusEnum.COMPLETED,
        createdAt: new Date(),
      };

      service.getPdfJobStatus.mockReturnValue(mockStatus);
      service.getPdfByJobId.mockReturnValue(mockPdfBuffer);

      controller.downloadPdf(jobId, mockResponse as Response);

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=health-report.pdf',
        'Content-Length': mockPdfBuffer.length,
      });
    });
  });
});
