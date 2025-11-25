import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { BloodTestValidation } from '@common/interfaces/blood-test-data.interface';
import {
  getValidationPrompt,
  AI_MODEL,
  AI_TEMPERATURE,
  MAX_VALIDATION_TOKENS,
  PDF_EXPIRY_MS,
  JOB_ID_PATTERN,
  PdfCacheEntry,
} from '@common/constants';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import {
  AiAnalysisResult,
  PdfJobStatus,
  PdfJobStatusEnum,
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
  private readonly pdfCache: Map<string, PdfCacheEntry> = new Map();

  constructor(
    private readonly openAI: OpenAI,
    private readonly pdfService: PdfService,
  ) {
    setInterval(
      () => {
        this.cleanupExpiredPdfs();
      },
      5 * 60 * 1000,
    );
  }

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

      const pdfJobId = this.generateJobId();

      this.pdfCache.set(pdfJobId, {
        buffer: Buffer.from([]),
        status: PdfJobStatusEnum.PENDING,
        createdAt: new Date(),
      });

      this.generatePdfInBackground(testResults, finalResult, pdfJobId);

      return {
        ...finalResult,
        pdfJobId,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error('Blood test analysis error:', getErrorMessage(err));
      throw error;
    }
  }

  private generateJobId(): string {
    return `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private validateJobId(jobId: string): boolean {
    const pattern: RegExp = JOB_ID_PATTERN;
    return pattern.test(jobId);
  }

  private generatePdfInBackground(
    data: CreateReviewDataDto,
    analysisResult: AiAnalysisResult,
    jobId: string,
  ): void {
    setImmediate(() => {
      (async () => {
        try {
          const pdfBuffer = await this.pdfService.generateHealthReportPdf(
            analysisResult,
            data,
            false,
          );

          this.pdfCache.set(jobId, {
            buffer: pdfBuffer,
            status: PdfJobStatusEnum.COMPLETED,
            createdAt: new Date(),
          });

          this.logger.log(`PDF generated successfully for job: ${jobId}`);

          const expiryTime: number = PDF_EXPIRY_MS;
          setTimeout(() => {
            this.deletePdf(jobId);
          }, expiryTime);
        } catch (error) {
          this.logger.error('Background PDF generation failed:', error);

          this.pdfCache.set(jobId, {
            buffer: Buffer.from([]),
            status: PdfJobStatusEnum.FAILED,
            error: error instanceof Error ? error.message : 'Unknown error',
            createdAt: new Date(),
          });
        }
      })().catch((err) => {
        this.logger.error('Unhandled error in PDF generation:', err);
      });
    });
  }

  getPdfJobStatus(jobId: string): PdfJobStatus | null {
    if (!this.validateJobId(jobId)) {
      this.logger.warn(`Invalid job ID format: ${jobId}`);
      return null;
    }

    const entry = this.pdfCache.get(jobId);
    if (!entry) {
      return null;
    }

    return {
      status: entry.status,
      createdAt: entry.createdAt,
      error: entry.error,
    };
  }

  getPdfByJobId(jobId: string): Buffer | null {
    if (!this.validateJobId(jobId)) {
      this.logger.warn(`Invalid job ID format: ${jobId}`);
      return null;
    }

    const entry = this.pdfCache.get(jobId);

    if (!entry || entry.status !== PdfJobStatusEnum.COMPLETED) {
      return null;
    }

    return entry.buffer;
  }

  private deletePdf(jobId: string): void {
    try {
      const deleted = this.pdfCache.delete(jobId);
      if (deleted) {
        this.logger.log(`PDF removed from memory: ${jobId}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting PDF for job ${jobId}:`, error);
    }
  }

  private cleanupExpiredPdfs(): void {
    const now = Date.now();
    const expiredJobs: string[] = [];
    const expiryMs: number = PDF_EXPIRY_MS;

    this.pdfCache.forEach((entry, jobId) => {
      const age = now - entry.createdAt.getTime();
      if (age > expiryMs) {
        expiredJobs.push(jobId);
      }
    });

    expiredJobs.forEach((jobId) => {
      this.deletePdf(jobId);
    });

    if (expiredJobs.length > 0) {
      this.logger.log(
        `Cleaned up ${expiredJobs.length} expired PDFs from memory`,
      );
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
