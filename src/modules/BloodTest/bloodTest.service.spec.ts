/* eslint-disable */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BloodTestService } from './bloodTest.service';
import { PdfService } from './pdf.service';
import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources';
import * as fs from 'fs';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import { AiAnalysisResult } from '@common/interfaces/analysis-result.interface';

jest.mock('fs');
jest.mock('path');

describe('BloodTestService', () => {
  let service: BloodTestService;
  let pdfService: PdfService;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockCreate: jest.Mock;

  const mockTestResults: CreateReviewDataDto = {
    birthYear: 2000,
    gender: 'male',
    pregnancy: null,
    markersData: [
      {
        id: 1,
        name: 'Bilirubin (Total)',
        value: '4.8',
        unit: 'mg/dL',
        normalRange: '0.1 - 1.2 mg/dL',
        hasError: false,
      },
      {
        id: 2,
        name: 'Glucose',
        value: '95',
        unit: 'mg/dL',
        normalRange: '70 - 100 mg/dL',
        hasError: false,
      },
    ],
    nutritionAdvice: true,
    supplementRecommendations: false,
    medicationGuidance: false,
    exerciseGuidelines: false,
    additionalQuestions: 'Why is my cholesterol high?',
  };

  const mockAiResponse: AiAnalysisResult = {
    bloodTestSummary: {
      overallWellnessScore: 75,
      overallSummary: 'Your results show some areas that need attention',
      detailedFindings: [
        'Bilirubin levels are elevated',
        'Glucose is within normal range',
      ],
      conclusionStatement: 'Overall health is good with minor concerns',
    },
    markersInterpretations: [
      {
        markerId: 1,
        markerName: 'Bilirubin (Total)',
        value: '4.8',
        unit: 'mg/dL',
        referenceMin: '0.1',
        referenceMax: '0.2',
        status: 'High',
        interpretation: {
          about: 'Measures liver function',
          whyImportant: 'Indicates liver health',
          contextualNote: 'Elevated levels may require attention',
        },
      },
      {
        markerId: 2,
        markerName: 'Glucose',
        value: '95',
        unit: 'mg/dL',
        referenceMin: '70',
        referenceMax: '100',
        status: 'Normal',
        interpretation: {
          about: 'Measures blood sugar',
          whyImportant: 'Important for diabetes screening',
          contextualNote: 'Within healthy range',
        },
      },
    ],
    nutritionRecommendations: {
      descriptions: [
        'Discuss with your doctor about increasing fiber intake',
        'Consult your healthcare provider about reducing sugar',
        'Your doctor may recommend more vegetables',
      ],
    },
    userQuestionResponse: {
      question: 'Why is my cholesterol high?',
      answer: 'Discuss with your doctor about cholesterol management',
    },
  };

  const mockPdfService = {
    generateHealthReportPdf: jest.fn(),
  };

  beforeEach(async () => {
    mockCreate = jest.fn();

    const mockChatCompletions = {
      create: mockCreate,
    };

    mockOpenAI = {
      chat: {
        completions: mockChatCompletions,
      },
    } as unknown as jest.Mocked<OpenAI>;

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
    pdfService = module.get<PdfService>(PdfService);

    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('analyzeBloodTest', () => {
    it('should return analysis result with pdfJobId', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );

      const result = await service.analyzeBloodTest(mockTestResults);

      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('pdfJobId');
      expect(result.analysis).toEqual(mockAiResponse);
      expect(result.pdfJobId).toMatch(/^pdf_\d+_[a-z0-9]+$/);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('PATIENT INFO') as string,
          },
        ],
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      });
    });

    it('should include nutrition recommendations when requested', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );
      const result = await service.analyzeBloodTest(mockTestResults);

      expect(result.analysis.nutritionRecommendations).toBeDefined();
      expect(
        result.analysis.nutritionRecommendations?.descriptions,
      ).toHaveLength(3);
    });

    it('should not include supplement recommendations when not requested', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );
      const result = await service.analyzeBloodTest(mockTestResults);

      expect(result.analysis.supplementsRecommendations).toBeUndefined();
    });

    it('should include user question response when question is provided', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );
      const result = await service.analyzeBloodTest(mockTestResults);

      expect(result.analysis.userQuestionResponse).toBeDefined();
      expect(result.analysis.userQuestionResponse?.question).toBe(
        'Why is my cholesterol high?',
      );
    });

    it('should throw error when AI returns invalid content', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );

      await expect(service.analyzeBloodTest(mockTestResults)).rejects.toThrow(
        'AI Analysis Failed: AI returned invalid content',
      );
    });

    it('should throw error when JSON parsing fails', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'invalid json content',
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );

      await expect(service.analyzeBloodTest(mockTestResults)).rejects.toThrow(
        'AI Analysis Failed',
      );
    });

    it('should handle OpenAI API errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API connection failed'));

      await expect(service.analyzeBloodTest(mockTestResults)).rejects.toThrow(
        'AI Analysis Failed: API connection failed',
      );
    });

    it('should process all markers from input data', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );
      const result = await service.analyzeBloodTest(mockTestResults);

      expect(result.analysis.markersInterpretations).toHaveLength(
        mockTestResults.markersData.length,
      );
    });

    it('should handle test results with all recommendation types', async () => {
      const fullTestResults: CreateReviewDataDto = {
        ...mockTestResults,
        supplementRecommendations: true,
        medicationGuidance: true,
        exerciseGuidelines: true,
      };

      const fullMockResponse: AiAnalysisResult = {
        ...mockAiResponse,
        supplementsRecommendations: {
          descriptions: [
            'Discuss with your doctor about Vitamin D',
            'Consult about Omega-3',
            'Your doctor may suggest probiotics',
          ],
        },
        drugsRecommendations: {
          descriptions: [
            'Your doctor may prescribe medication',
            'Consult about treatment options',
            'Discuss prescription options',
          ],
        },
        exerciseRecommendations: {
          descriptions: [
            'Ask your doctor about exercise program',
            'Consult about cardio activities',
            'Your doctor may recommend strength training',
          ],
        },
      };

      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(fullMockResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );

      const result = await service.analyzeBloodTest(fullTestResults);

      expect(result.analysis.supplementsRecommendations).toBeDefined();
      expect(result.analysis.drugsRecommendations).toBeDefined();
      expect(result.analysis.exerciseRecommendations).toBeDefined();
      expect(result.analysis.nutritionRecommendations).toBeDefined();
    });

    it('should include pregnancy status in prompt when provided', async () => {
      const pregnantTestResults: CreateReviewDataDto = {
        ...mockTestResults,
        gender: 'female',
        pregnancy: 'pregnant',
      };

      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );

      await service.analyzeBloodTest(pregnantTestResults);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            {
              role: 'user',
              content: expect.stringContaining(
                'Pregnancy status: pregnant',
              ) as string,
            },
          ],
        }),
      );
    });

    it('should start PDF generation in background', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );

      const result = await service.analyzeBloodTest(mockTestResults);

      // Check that job is in pending state
      const jobStatus = service.getPdfJobStatus(result.pdfJobId);
      expect(jobStatus).toBeDefined();
      expect(jobStatus?.status).toBe('pending');
    });

    it('should create unique pdfJobId for each analysis', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockCompletion as Partial<ChatCompletion>);

      const result1 = await service.analyzeBloodTest(mockTestResults);
      const result2 = await service.analyzeBloodTest(mockTestResults);

      expect(result1.pdfJobId).not.toBe(result2.pdfJobId);
    });
  });

  describe('getPdfJobStatus', () => {
    it('should return null for non-existent job', () => {
      const status = service.getPdfJobStatus('non-existent-job');
      expect(status).toBeNull();
    });

    it('should return job status for existing job', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );

      const result = await service.analyzeBloodTest(mockTestResults);
      const status = service.getPdfJobStatus(result.pdfJobId);

      expect(status).toBeDefined();
      expect(status?.status).toBe('pending');
      expect(status?.createdAt).toBeInstanceOf(Date);
    });

    it('should return completed status after successful generation', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );
      mockPdfService.generateHealthReportPdf.mockResolvedValue(
        Buffer.from('pdf'),
      );

      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.analyzeBloodTest(mockTestResults);

      // Run pending background tasks
      await jest.runAllTimersAsync();

      const status = service.getPdfJobStatus(result.pdfJobId);
      expect(status?.status).toBe('completed');
      expect(status?.filename).toBeDefined();
    });
  });

  describe('getPdfByJobId', () => {
    it('should return null for non-existent job', async () => {
      const pdf = await service.getPdfByJobId('non-existent-job');
      expect(pdf).toBeNull();
    });

    it('should return null for pending job', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );

      const result = await service.analyzeBloodTest(mockTestResults);
      const pdf = await service.getPdfByJobId(result.pdfJobId);

      expect(pdf).toBeNull();
    });

    it('should return PDF buffer for completed job', async () => {
      const mockCompletion = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockAiResponse),
            },
          },
        ],
      };

      const mockPdfBuffer = Buffer.from('pdf content');
      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );
      mockPdfService.generateHealthReportPdf.mockResolvedValue(mockPdfBuffer);

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(mockPdfBuffer);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);

      const result = await service.analyzeBloodTest(mockTestResults);

      await jest.runAllTimersAsync();

      const pdf = await service.getPdfByJobId(result.pdfJobId);
      expect(pdf).toEqual(mockPdfBuffer);
    });
  });

  describe('validateBloodTest', () => {
    it('should validate blood test successfully', async () => {
      const mockValidation = {
        isBloodTest: true,
        reason: 'Valid blood test',
        confidence: 'high',
      };

      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockValidation),
            },
          },
        ],
      } as Partial<ChatCompletion>);

      const result = await service.validateBloodTest({} as any);

      expect(result).toEqual(mockValidation);
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should return fallback on parsing error', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'invalid json',
            },
          },
        ],
      } as Partial<ChatCompletion>);

      const result = await service.validateBloodTest({} as any);

      expect(result).toEqual({
        isBloodTest: false,
        reason: 'Failed to parse AI response',
        confidence: 'low',
      });
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API Error'));

      const result = await service.validateBloodTest({} as any);

      expect(result).toEqual({
        isBloodTest: false,
        reason: 'API error: API Error',
        confidence: 'low',
      });
    });
  });

  describe('utility functions', () => {
    it('safeJsonParse should parse valid JSON', () => {
      const { safeJsonParse } = require('./bloodTest.service');
      const result = safeJsonParse('{"key":"value"}', {});
      expect(result).toEqual({ key: 'value' });
    });

    it('safeJsonParse should return fallback on invalid JSON', () => {
      const { safeJsonParse } = require('./bloodTest.service');
      const fallback = { default: true };
      const result = safeJsonParse('invalid', fallback);
      expect(result).toEqual(fallback);
    });

    it('cleanJsonString should remove markdown code blocks', () => {
      const { cleanJsonString } = require('./bloodTest.service');
      const result = cleanJsonString('```json\n{"key":"value"}\n```');
      expect(result).toBe('{"key":"value"}');
    });
  });
});
