/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import axios from 'axios';
import { PdfService } from '../pdf.service';
import { AiAnalysisResult } from '@common/interfaces/analysis-result.interface';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';

jest.mock('axios');
jest.mock('fs');
jest.mock('path');
jest.mock('pdfkit');

describe('PdfService', () => {
  let service: PdfService;

  const mockAnalysisResult: AiAnalysisResult = {
    bloodTestSummary: {
      overallWellnessScore: 85,
      overallSummary:
        'Your blood test results show overall good health with some areas requiring attention.',
      detailedFindings: [
        'Glucose levels are within normal range',
        'Cholesterol slightly elevated',
        'Vitamin D levels are optimal',
      ],
      conclusionStatement:
        'Continue maintaining a healthy lifestyle with minor dietary adjustments.',
    },
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
          about: 'Blood sugar measurement',
          whyImportant: 'Essential for energy metabolism',
          contextualNote: 'Your glucose level is within healthy range',
        },
      },
      {
        markerId: 2,
        markerName: 'Cholesterol',
        value: '210',
        unit: 'mg/dL',
        referenceMin: '125',
        referenceMax: '200',
        status: 'Slightly High',
        interpretation: {
          about: 'Blood lipid level',
          whyImportant: 'Affects cardiovascular health',
          contextualNote: 'Consider dietary changes to lower cholesterol',
        },
      },
    ],
    nutritionRecommendations: {
      descriptions: [
        'Increase fiber intake through whole grains and vegetables',
        'Reduce saturated fat consumption',
        'Include omega-3 rich foods like fish',
      ],
    },
    exerciseRecommendations: {
      descriptions: [
        'Aim for 150 minutes of moderate aerobic activity weekly',
        'Include strength training twice per week',
      ],
    },
    userQuestionResponse: {
      question: 'Why is my cholesterol slightly high?',
      answer:
        'Elevated cholesterol can result from diet, genetics, or lifestyle factors. Consider reducing saturated fats and increasing physical activity.',
    },
    pdfJobId: 'pdf_123456789_test',
  };

  const mockInputData: CreateReviewDataDto = {
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
        value: '210',
        unit: 'mg/dL',
        normalRange: '125-200 mg/dL',
        hasError: false,
      },
    ],
    nutritionAdvice: true,
    supplementRecommendations: false,
    medicationGuidance: false,
    exerciseGuidelines: true,
    additionalQuestions: 'Why is my cholesterol slightly high?',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);

    const mockDoc = {
      pipe: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return mockDoc;
      }),
      end: jest.fn(),
      registerFont: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      strokeColor: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      image: jest.fn().mockReturnThis(),
      roundedRect: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      circle: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      lineWidth: jest.fn().mockReturnThis(),
      lineCap: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      fillAndStroke: jest.fn().mockReturnThis(),
      save: jest.fn().mockReturnThis(),
      restore: jest.fn().mockReturnThis(),
      path: jest.fn().mockReturnThis(),
      clip: jest.fn().mockReturnThis(),
      closePath: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      heightOfString: jest.fn().mockReturnValue(20),
      y: 100,
    };

    (PDFDocument as unknown as jest.Mock).mockImplementation(() => mockDoc);

    (axios.get as jest.Mock).mockResolvedValue({
      data: Buffer.from('mock-logo'),
    });

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateHealthReportPdf', () => {
    it('should generate PDF successfully', async () => {
      const result = await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        false,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(PDFDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 'A4',
          bufferPages: true,
        }),
      );
    });

    it('should load and embed logo image', async () => {
      await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        false,
      );

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('cloudinary'),
        expect.objectContaining({ responseType: 'arraybuffer' }),
      );
    });

    it('should handle logo loading failure gracefully', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        false,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should register custom fonts', async () => {
      const mockDoc = (PDFDocument as unknown as jest.Mock).mock.results[0]
        .value;

      await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        false,
      );

      expect(mockDoc.registerFont).toHaveBeenCalledWith(
        'Poppins-Regular',
        expect.stringContaining('Poppins-Regular.ttf'),
      );
      expect(mockDoc.registerFont).toHaveBeenCalledWith(
        'Inter-Regular',
        expect.stringContaining('Inter-Regular.otf'),
      );
      expect(mockDoc.registerFont).toHaveBeenCalledWith(
        'Inter-Bold',
        expect.stringContaining('Inter-Bold.otf'),
      );
      expect(mockDoc.registerFont).toHaveBeenCalledWith(
        'Inter-Italic',
        expect.stringContaining('Inter-Italic.otf'),
      );
    });

    it('should save PDF to debug directory when debug is true', async () => {
      await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        true,
      );

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle multiple marker pages correctly', async () => {
      const manyMarkers = Array.from({ length: 30 }, (_, i) => ({
        markerId: i + 1,
        markerName: `Marker ${i + 1}`,
        value: '100',
        unit: 'mg/dL',
        referenceMin: '80',
        referenceMax: '120',
        status: 'Normal' as const,
        interpretation: {
          about: `About marker ${i + 1}`,
          whyImportant: 'Important for health',
          contextualNote: 'Normal range',
        },
      }));

      const largeAnalysisResult: AiAnalysisResult = {
        ...mockAnalysisResult,
        markersInterpretations: manyMarkers,
      };

      const mockDoc = (PDFDocument as unknown as jest.Mock).mock.results[0]
        .value;

      await service.generateHealthReportPdf(
        largeAnalysisResult,
        mockInputData,
        false,
      );

      expect(mockDoc.addPage).toHaveBeenCalled();
    });

    it('should include all requested recommendations', async () => {
      const fullInputData: CreateReviewDataDto = {
        ...mockInputData,
        nutritionAdvice: true,
        supplementRecommendations: true,
        medicationGuidance: true,
        exerciseGuidelines: true,
        additionalQuestions: 'Test question',
      };

      const fullAnalysisResult: AiAnalysisResult = {
        ...mockAnalysisResult,
        supplementsRecommendations: {
          descriptions: ['Vitamin D supplement', 'Omega-3 supplement'],
        },
        drugsRecommendations: {
          descriptions: ['Consult with doctor about statins'],
        },
      };

      const result = await service.generateHealthReportPdf(
        fullAnalysisResult,
        fullInputData,
        false,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should create separate recommendations page when needed', async () => {
      const manyRecommendations = Array.from(
        { length: 20 },
        (_, i) =>
          `Recommendation ${i + 1}: This is a detailed recommendation that takes up space.`,
      );

      const largeRecommendationsResult: AiAnalysisResult = {
        ...mockAnalysisResult,
        nutritionRecommendations: {
          descriptions: manyRecommendations,
        },
      };

      const mockDoc = (PDFDocument as unknown as jest.Mock).mock.results[0]
        .value;

      await service.generateHealthReportPdf(
        largeRecommendationsResult,
        mockInputData,
        false,
      );

      expect(mockDoc.addPage).toHaveBeenCalled();
    });

    it('should sanitize special characters in text', async () => {
      const specialCharsResult: AiAnalysisResult = {
        ...mockAnalysisResult,
        markersInterpretations: [
          {
            markerId: 1,
            markerName: 'μg/dL Test',
            value: '95°',
            unit: 'μg/dL',
            referenceMin: '70±5',
            referenceMax: '100≥',
            status: 'Normal',
            interpretation: {
              about: 'Test with special chars',
              whyImportant: 'Important',
              contextualNote: 'Normal',
            },
          },
        ],
      };

      const result = await service.generateHealthReportPdf(
        specialCharsResult,
        mockInputData,
        false,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle wellness scores correctly', async () => {
      const scores = [45, 75, 95];

      for (const score of scores) {
        const testResult: AiAnalysisResult = {
          ...mockAnalysisResult,
          bloodTestSummary: {
            ...mockAnalysisResult.bloodTestSummary,
            overallWellnessScore: score,
          },
        };

        const result = await service.generateHealthReportPdf(
          testResult,
          mockInputData,
          false,
        );

        expect(Buffer.isBuffer(result)).toBe(true);
      }
    });

    it('should draw health bar for different marker statuses', async () => {
      const statusResults: AiAnalysisResult = {
        ...mockAnalysisResult,
        markersInterpretations: [
          {
            markerId: 1,
            markerName: 'Low Marker',
            value: '50',
            unit: 'mg/dL',
            referenceMin: '70',
            referenceMax: '100',
            status: 'Low',
            interpretation: {
              about: 'Low marker',
              whyImportant: 'Important',
              contextualNote: 'Below range',
            },
          },
          {
            markerId: 2,
            markerName: 'High Marker',
            value: '150',
            unit: 'mg/dL',
            referenceMin: '70',
            referenceMax: '100',
            status: 'High',
            interpretation: {
              about: 'High marker',
              whyImportant: 'Important',
              contextualNote: 'Above range',
            },
          },
          {
            markerId: 3,
            markerName: 'Critical Marker',
            value: '300',
            unit: 'mg/dL',
            referenceMin: '70',
            referenceMax: '100',
            status: 'Critical',
            interpretation: {
              about: 'Critical marker',
              whyImportant: 'Very important',
              contextualNote: 'Requires attention',
            },
          },
        ],
      };

      const result = await service.generateHealthReportPdf(
        statusResults,
        mockInputData,
        false,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should include user question and answer when provided', async () => {
      const withQuestion: CreateReviewDataDto = {
        ...mockInputData,
        additionalQuestions: 'What should I do about my cholesterol?',
      };

      const result = await service.generateHealthReportPdf(
        mockAnalysisResult,
        withQuestion,
        false,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle empty recommendations gracefully', async () => {
      const noRecommendations: AiAnalysisResult = {
        ...mockAnalysisResult,
        nutritionRecommendations: undefined,
        exerciseRecommendations: undefined,
        userQuestionResponse: undefined,
      };

      const noRecsInput: CreateReviewDataDto = {
        ...mockInputData,
        nutritionAdvice: false,
        exerciseGuidelines: false,
        additionalQuestions: undefined,
      };

      const result = await service.generateHealthReportPdf(
        noRecommendations,
        noRecsInput,
        false,
      );

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should handle PDF generation errors', async () => {
      const mockDoc = (PDFDocument as unknown as jest.Mock).mock.results[0]
        .value;
      mockDoc.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('PDF generation error')), 0);
        }
        return mockDoc;
      });

      await expect(
        service.generateHealthReportPdf(
          mockAnalysisResult,
          mockInputData,
          false,
        ),
      ).rejects.toThrow('PDF generation error');
    });

    it('should add footer with page numbers', async () => {
      const mockDoc = (PDFDocument as unknown as jest.Mock).mock.results[0]
        .value;

      await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        false,
      );

      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Page'),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should include disclaimer in footer', async () => {
      const mockDoc = (PDFDocument as unknown as jest.Mock).mock.results[0]
        .value;

      await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        false,
      );

      expect(mockDoc.text).toHaveBeenCalledWith(
        expect.stringContaining('Disclaimer'),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
  });
});
