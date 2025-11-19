import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { BloodTestValidation } from '@common/interfaces/blood-test-data.interface';
import {
  getBloodTestAnalysisPrompt,
  getValidationPrompt,
} from '@common/constants';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import { AiAnalysisResult } from '@common/interfaces/analysis-result.inteface';

export function safeJsonParse<T>(json: string, fallback: T): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
    if (typeof parsed !== typeof fallback) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function cleanJsonString(str: string): string {
  let cleaned = str.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  cleaned = cleaned.trim();
  return cleaned;
}

@Injectable()
export class BloodTestService {
  private readonly MAX_TOKENS = 4000;
  private readonly MODEL = 'gpt-4o-mini';

  constructor(private readonly openAI: OpenAI) {}

  async analyzeBloodTest(
    testResults: CreateReviewDataDto,
  ): Promise<AiAnalysisResult> {
    try {
      const prompt = getBloodTestAnalysisPrompt(testResults);
      const completion = await this.openAI.chat.completions.create({
        model: this.MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });
      const rawContent = completion.choices[0]?.message?.content;

      if (typeof rawContent !== 'string') {
        throw new Error('AI returned invalid content');
      }

      const cleaned = cleanJsonString(rawContent);
      const parsed = safeJsonParse<AiAnalysisResult>(cleaned, null);

      if (parsed === null || typeof parsed !== 'object') {
        throw new Error('Failed to parse AI JSON response: not an object');
      }

      return parsed;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`AI Analysis Failed: ${errorMessage}`);
    }
  }

  async validateBloodTest(values: BloodTestData): Promise<BloodTestValidation> {
    try {
      const prompt = getValidationPrompt(values);

      const completion = await this.openAI.chat.completions.create({
        model: this.MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || '';
      const cleaned = cleanJsonString(content);

      return safeJsonParse<BloodTestValidation>(cleaned, {
        isBloodTest: false,
        reason: 'Failed to parse AI response',
        confidence: 'low',
      });
    } catch (error) {
      console.error('Blood test validation error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        isBloodTest: false,
        reason: `API error: ${errorMessage}`,
        confidence: 'low',
      };
    }
  }
}
