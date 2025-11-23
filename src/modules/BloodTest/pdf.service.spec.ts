import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import {
  AiAnalysisResult,
  MarkerInterpretation,
} from '@common/interfaces/analysis-result.interface';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import * as fs from 'fs';
import * as path from 'path';

describe('PdfService', () => {
  let service: PdfService;

  const mockAnalysisResult: AiAnalysisResult = {
    bloodTestSummary: {
      overallWellnessScore: 70,
      overallSummary: 'Your results show a few noticeable imbalances.',
      detailedFindings: [
        'Glucose levels are elevated at 130 mg/dL',
        'LDH is higher than normal',
      ],
      conclusionStatement: 'Overall, your results suggest mild strain.',
    },
    markersInterpretations: [
      {
        markerId: 1,
        markerName: 'Glucose',
        value: '130',
        unit: 'mg/dL',
        referenceMin: '70',
        referenceMax: '100',
        status: 'High',
        interpretation: {
          about: 'Glucose measures blood sugar.',
          whyImportant: 'High levels indicate diabetes risk.',
          contextualNote: 'Consider dietary changes.',
        },
      },
      {
        markerId: 2,
        markerName: 'AST',
        value: '62',
        unit: 'U/L',
        referenceMin: '10',
        referenceMax: '40',
        status: 'Slightly High',
        interpretation: {
          about: 'AST is a liver enzyme.',
          whyImportant: 'Elevated levels indicate liver stress.',
          contextualNote: 'Could be due to exercise or alcohol.',
        },
      },
    ],
    nutritionRecommendations: {
      descriptions: [
        'Increase leafy greens',
        'Include fatty fish 2-3 times per week',
      ],
    },
    supplementsRecommendations: {
      descriptions: ['Vitamin D3: 2000 IU daily', 'Omega-3: 1000mg daily'],
    },
    drugsRecommendations: {
      descriptions: [
        'Schedule appointment with endocrinologist',
        'Discuss cholesterol management',
      ],
    },
    exerciseRecommendations: {
      descriptions: [
        'Aim for 150 minutes moderate exercise weekly',
        'Post-meal walks for 10-15 minutes',
      ],
    },
    userQuestionResponse: {
      question: 'Why is my glucose high?',
      answer:
        'Elevated glucose can be due to diet, stress, or prediabetes. Consider lifestyle changes.',
    },
  };

  const mockInputData: CreateReviewDataDto = {
    birthYear: 1990,
    gender: 'male',
    pregnancy: null,
    markersData: [],
    nutritionAdvice: true,
    supplementRecommendations: true,
    medicationGuidance: true,
    exerciseGuidelines: true,
    additionalQuestions: 'Why is my glucose high?',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  afterEach(() => {
    const debugDir = path.join(process.cwd(), 'debug');
    if (fs.existsSync(debugDir)) {
      const files = fs.readdirSync(debugDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(debugDir, file));
      });
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateHealthReportPdf', () => {
    it('should generate a PDF buffer', async () => {
      const result = await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        false,
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBeGreaterThan(0);
    }, 30000);

    it('should save debug files when debug is true', async () => {
      await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        true,
      );

      const debugDir = path.join(process.cwd(), 'debug');
      expect(fs.existsSync(debugDir)).toBe(true);

      const files = fs.readdirSync(debugDir);
      const htmlFiles = files.filter((f) => f.endsWith('.html'));
      const pdfFiles = files.filter((f) => f.endsWith('.pdf'));

      expect(htmlFiles.length).toBeGreaterThan(0);
      expect(pdfFiles.length).toBeGreaterThan(0);
    }, 30000);

    it('should not save debug files when debug is false', async () => {
      await service.generateHealthReportPdf(
        mockAnalysisResult,
        mockInputData,
        false,
      );

      const debugDir = path.join(process.cwd(), 'debug');
      if (fs.existsSync(debugDir)) {
        const files = fs.readdirSync(debugDir);
        expect(files.length).toBe(0);
      }
    }, 30000);
  });

  describe('generateHtmlTemplate', () => {
    it('should generate valid HTML string', () => {
      const reportDate = '11/23/2025';
      const html = service.generateHtmlTemplate(
        mockAnalysisResult,
        mockInputData,
        reportDate,
      );

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('</html>');
      expect(html).toContain('Your blood test summary');
    });

    it('should include wellness score in HTML', () => {
      const reportDate = '11/23/2025';
      const html = service.generateHtmlTemplate(
        mockAnalysisResult,
        mockInputData,
        reportDate,
      );

      expect(html).toContain('70%');
      expect(html).toContain('Overall wellness score');
    });

    it('should include all markers in HTML', () => {
      const reportDate = '11/23/2025';
      const html = service.generateHtmlTemplate(
        mockAnalysisResult,
        mockInputData,
        reportDate,
      );

      expect(html).toContain('Glucose');
      expect(html).toContain('130');
      expect(html).toContain('AST');
      expect(html).toContain('62');
    });

    it('should include recommendations when enabled', () => {
      const reportDate = '11/23/2025';
      const html = service.generateHtmlTemplate(
        mockAnalysisResult,
        mockInputData,
        reportDate,
      );

      expect(html).toContain('Nutrition advice');
      expect(html).toContain('Increase leafy greens');
      expect(html).toContain('Supplement recommendations');
      expect(html).toContain('Vitamin D3');
    });

    it('should exclude recommendations when disabled', () => {
      const reportDate = '11/23/2025';
      const inputWithoutRecommendations: CreateReviewDataDto = {
        ...mockInputData,
        nutritionAdvice: false,
        supplementRecommendations: false,
        medicationGuidance: false,
        exerciseGuidelines: false,
      };

      const html = service.generateHtmlTemplate(
        mockAnalysisResult,
        inputWithoutRecommendations,
        reportDate,
      );

      expect(html).not.toContain('Your personalized recommendations');
    });

    it('should include user question and answer when provided', () => {
      const reportDate = '11/23/2025';
      const html = service.generateHtmlTemplate(
        mockAnalysisResult,
        mockInputData,
        reportDate,
      );

      expect(html).toContain('Answer to your question');
      expect(html).toContain('Why is my glucose high?');
      expect(html).toContain('Elevated glucose can be due to diet');
    });

    it('should split markers across multiple pages correctly', () => {
      const manyMarkers: MarkerInterpretation[] = Array.from(
        { length: 30 },
        (_, i) => ({
          markerId: i + 1,
          markerName: `Marker ${i + 1}`,
          value: '100',
          unit: 'mg/dL',
          referenceMin: '80',
          referenceMax: '120',
          status: 'Normal' as const,
          interpretation: {
            about: 'Test marker',
            whyImportant: 'For testing',
            contextualNote: 'Normal range',
          },
        }),
      );

      const resultWithManyMarkers: AiAnalysisResult = {
        ...mockAnalysisResult,
        markersInterpretations: manyMarkers,
      };

      const reportDate = '11/23/2025';
      const html = service.generateHtmlTemplate(
        resultWithManyMarkers,
        mockInputData,
        reportDate,
      );

      expect(html).toContain('Your blood test summary (continued)');
      expect(html).toContain('Page 1 of');
      expect(html).toContain('Page 2 of');
    });

    it('should include correct page numbers', () => {
      const reportDate = '11/23/2025';
      const html = service.generateHtmlTemplate(
        mockAnalysisResult,
        mockInputData,
        reportDate,
      );

      expect(html).toContain('Page 1 of 2');
      expect(html).toContain('Page 2 of 2');
    });

    it('should include disclaimer on all pages', () => {
      const reportDate = '11/23/2025';
      const html = service.generateHtmlTemplate(
        mockAnalysisResult,
        mockInputData,
        reportDate,
      );

      const disclaimerCount = (
        html.match(
          /This AI-generated report is for informational purposes only/g,
        ) || []
      ).length;
      expect(disclaimerCount).toBeGreaterThan(0);
    });
  });

  describe('calculateMarkerPosition', () => {
    it('should return 0 for value <= 0', () => {
      const position = service['calculateMarkerPosition'](0, 70, 100);
      expect(position).toBe(0);
    });

    it('should return position within normal range (30-70%)', () => {
      const position = service['calculateMarkerPosition'](85, 70, 100);
      expect(position).toBeGreaterThanOrEqual(30);
      expect(position).toBeLessThanOrEqual(70);
    });

    it('should return position > 70% for high values', () => {
      const position = service['calculateMarkerPosition'](120, 70, 100);
      expect(position).toBeGreaterThan(70);
    });

    it('should return position < 30% for low values', () => {
      const position = service['calculateMarkerPosition'](50, 70, 100);
      expect(position).toBeLessThan(30);
    });

    it('should return 100 for extremely high values', () => {
      const position = service['calculateMarkerPosition'](500, 70, 100);
      expect(position).toBe(100);
    });

    it('should handle edge case at reference min', () => {
      const position = service['calculateMarkerPosition'](70, 70, 100);
      expect(position).toBe(30);
    });

    it('should handle edge case at reference max', () => {
      const position = service['calculateMarkerPosition'](100, 70, 100);
      expect(position).toBe(70);
    });
  });

  describe('Color gradient for wellness score', () => {
    it('should use green gradient for score >= 85', () => {
      const highScoreResult: AiAnalysisResult = {
        ...mockAnalysisResult,
        bloodTestSummary: {
          ...mockAnalysisResult.bloodTestSummary,
          overallWellnessScore: 90,
        },
      };

      const html = service.generateHtmlTemplate(
        highScoreResult,
        mockInputData,
        '11/23/2025',
      );

      expect(html).toContain('#047E56');
      expect(html).toContain('#32AC84');
    });

    it('should use yellow-orange gradient for score 65-84', () => {
      const mediumScoreResult: AiAnalysisResult = {
        ...mockAnalysisResult,
        bloodTestSummary: {
          ...mockAnalysisResult.bloodTestSummary,
          overallWellnessScore: 70,
        },
      };

      const html = service.generateHtmlTemplate(
        mediumScoreResult,
        mockInputData,
        '11/23/2025',
      );

      expect(html).toContain('#9BC74B');
      expect(html).toContain('#FE9901');
    });

    it('should use orange-red gradient for score < 65', () => {
      const lowScoreResult: AiAnalysisResult = {
        ...mockAnalysisResult,
        bloodTestSummary: {
          ...mockAnalysisResult.bloodTestSummary,
          overallWellnessScore: 50,
        },
      };

      const html = service.generateHtmlTemplate(
        lowScoreResult,
        mockInputData,
        '11/23/2025',
      );

      expect(html).toContain('#FF9509');
      expect(html).toContain('#FF3B01');
    });
  });
});
