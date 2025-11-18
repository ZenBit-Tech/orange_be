import { Test, TestingModule } from '@nestjs/testing';
import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import { AiAnalysisResult } from '@common/interfaces/analysis-result.inteface';
import { BloodTestService } from './bloodTest.service';

jest.mock('openai');

describe('BloodTestService', () => {
  let bloodTestService: BloodTestService;
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
      summary: 'Your results show some areas that need attention',
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
        normalRange: '0.1 - 1.2 mg/dL',
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
        normalRange: '70 - 100 mg/dL',
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
      ],
    }).compile();

    bloodTestService = module.get<BloodTestService>(BloodTestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeBloodTest', () => {
    it('should return valid AI analysis result', async () => {
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
      const result = await bloodTestService.analyzeBloodTest(mockTestResults);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('PATIENT INFO') as string,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      expect(result).toEqual(mockAiResponse);
      expect(result.bloodTestSummary.overallWellnessScore).toBe(75);
      expect(result.markersInterpretations).toHaveLength(2);
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
      const result = await bloodTestService.analyzeBloodTest(mockTestResults);

      expect(result.nutritionRecommendations).toBeDefined();
      expect(result.nutritionRecommendations?.descriptions).toHaveLength(3);
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
      const result = await bloodTestService.analyzeBloodTest(mockTestResults);

      expect(result.supplementsRecommendations).toBeUndefined();
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
      const result = await bloodTestService.analyzeBloodTest(mockTestResults);

      expect(result.userQuestionResponse).toBeDefined();
      expect(result.userQuestionResponse?.question).toBe(
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
      await expect(
        bloodTestService.analyzeBloodTest(mockTestResults),
      ).rejects.toThrow('AI Analysis Failed: AI returned invalid content');
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

      jest.spyOn(mockOpenAI.chat.completions, 'create');
      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );
      await expect(
        bloodTestService.analyzeBloodTest(mockTestResults),
      ).rejects.toThrow('AI Analysis Failed');
    });

    it('should handle OpenAI API errors', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API connection failed'));

      await expect(
        bloodTestService.analyzeBloodTest(mockTestResults),
      ).rejects.toThrow('AI Analysis Failed: API connection failed');
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

      jest.spyOn(mockOpenAI.chat.completions, 'create');
      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );
      const result = await bloodTestService.analyzeBloodTest(mockTestResults);

      expect(result.markersInterpretations).toHaveLength(
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

      jest.spyOn(mockOpenAI.chat.completions, 'create');
      mockCreate.mockResolvedValueOnce(
        mockCompletion as Partial<ChatCompletion>,
      );

      const result = await bloodTestService.analyzeBloodTest(fullTestResults);

      expect(result.supplementsRecommendations).toBeDefined();
      expect(result.drugsRecommendations).toBeDefined();
      expect(result.exerciseRecommendations).toBeDefined();
      expect(result.nutritionRecommendations).toBeDefined();
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

      await bloodTestService.analyzeBloodTest(pregnantTestResults);

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
  });
});
