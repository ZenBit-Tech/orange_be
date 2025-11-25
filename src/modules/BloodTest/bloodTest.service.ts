import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { BloodTestValidation } from '@common/interfaces/blood-test-data.interface';
import {
  getValidationPrompt,
  AI_MODEL,
  AI_TEMPERATURE,
  MAX_VALIDATION_TOKENS,
} from '@common/constants';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import {
  AiAnalysisResult,
  ValidationConfidence,
} from '@common/interfaces/analysis-result.interface';
import { PdfService } from './pdf.service';
import {
  getMarkersChunkPrompt,
  getSummaryAndRecsPrompt,
  SingleMarkerDto,
} from '@prompts/analysis.prompt';

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error';
}

interface MarkersChunkResponse {
  markersInterpretations: AiAnalysisResult['markersInterpretations'];
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

@Injectable()
export class BloodTestService {
  private readonly logger = new Logger(BloodTestService.name);

  constructor(
    private readonly openAI: OpenAI,
    private readonly pdfService: PdfService,
  ) {}

  async analyzeBloodTest(
    testResults: CreateReviewDataDto,
  ): Promise<AiAnalysisResult> {
    try {
      const BATCH_SIZE = 10;
      const markerChunks: SingleMarkerDto[][] = chunkArray(
        testResults.markersData,
        BATCH_SIZE,
      );

      const summaryPromise = this.openAI.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'user', content: getSummaryAndRecsPrompt(testResults) },
        ],
      });

      const chunkPromises = markerChunks.map((chunk) =>
        this.openAI.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: getMarkersChunkPrompt(chunk) }],
        }),
      );

      const [summaryResponse, ...chunksResponses] = await Promise.all([
        summaryPromise,
        ...chunkPromises,
      ]);

      const summaryRaw = summaryResponse.choices[0]?.message?.content || '{}';
      const summaryJson = safeJsonParse<AiAnalysisResult>(
        summaryRaw,
        {} as AiAnalysisResult,
      );

      const allMarkersInterpretations: AiAnalysisResult['markersInterpretations'] =
        [];

      for (const response of chunksResponses) {
        const chunkRaw = response.choices[0]?.message?.content || '{}';

        const chunkJson = safeJsonParse<MarkersChunkResponse>(chunkRaw, {
          markersInterpretations: [],
        });

        if (Array.isArray(chunkJson.markersInterpretations)) {
          allMarkersInterpretations.push(...chunkJson.markersInterpretations);
        }
      }

      const finalResult: AiAnalysisResult = {
        ...summaryJson,
        markersInterpretations: allMarkersInterpretations,
      };

      return finalResult;
    } catch (error) {
      const err = error as Error;
      this.logger.error('Blood test analysis error:', getErrorMessage(err));
      throw error;
    }
  }

  async generatePdf(
    testResults: CreateReviewDataDto,
    analysisResult: AiAnalysisResult,
  ): Promise<Buffer> {
    try {
      this.logger.log('Generating PDF on-demand');
      return await this.pdfService.generateHealthReportPdf(
        analysisResult,
        testResults,
      );
    } catch (error) {
      this.logger.error('PDF generation error:', error);
      throw error;
    }
  }

  async validateBloodTest(values: BloodTestData): Promise<BloodTestValidation> {
    try {
      const prompt = getValidationPrompt(values);
      const model: string = AI_MODEL;
      const temperature: number = AI_TEMPERATURE;
      const maxTokens: number = MAX_VALIDATION_TOKENS;

      const completion = await this.openAI.chat.completions.create({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature,
        max_tokens: maxTokens,
      });

      const content = completion.choices[0]?.message?.content || '';
      const cleaned = cleanJsonString(content);

      return safeJsonParse<BloodTestValidation>(cleaned, {
        isBloodTest: false,
        reason: 'Failed to parse AI response',
        confidence: ValidationConfidence.LOW,
      });
    } catch (error) {
      this.logger.error('Blood test validation error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        isBloodTest: false,
        reason: `API error: ${errorMessage}`,
        confidence: ValidationConfidence.LOW,
      };
    }
  }
}
