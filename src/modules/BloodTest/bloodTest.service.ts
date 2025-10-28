import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { BloodTestValidation } from '@common/interfaces/blood-test-data.interface';
import { getValidationPrompt } from '@common/constants';

export function safeJsonParse<T>(json: string, fallback: T): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fallback;
  }
  return parsed as T;
}

export function cleanJsonString(str: string): string {
  let cleaned = str.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  cleaned = cleaned.trim();
  return cleaned;
}

@Injectable()
export class BloodTestService {
  private readonly MAX_TOKENS = 4000;
  private readonly MODEL = 'gpt-4-turbo-preview';

  constructor(private readonly openAI: OpenAI) {}

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
