import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { LRUCache } from 'lru-cache';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { BloodTestValidation } from '@common/interfaces/blood-test-data.interface';
import {
  getValidationPrompt,
  AI_MODEL,
  AI_TEMPERATURE,
  MAX_VALIDATION_TOKENS,
  PDF_DIR_NAME,
  JOB_ID_PATTERN,
} from '@common/constants';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import {
  AiAnalysisResult,
  PdfJobStatus,
  PdfJobStatusEnum,
  ValidationConfidence,
} from '@common/interfaces/analysis-result.interface';
import { PdfService } from './pdf.service';
import * as fs from 'fs';
import * as path from 'path';
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
  private readonly pdfJobs: LRUCache<string, PdfJobStatus>;
  private readonly downloadedPdfs: Set<string>;

  constructor(
    private readonly openAI: OpenAI,
    private readonly pdfService: PdfService,
  ) {
    this.pdfJobs = new LRUCache({
      max: 100,
      ttl: 1000 * 60 * 15,
      updateAgeOnGet: false,
    });

    this.downloadedPdfs = new Set();

    setInterval(
      () => {
        this.cleanupExpiredPdfs();
      },
      2 * 60 * 1000,
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

      if (global.gc) {
        global.gc();
      }

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

      this.pdfJobs.set(pdfJobId, {
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
      throw new Error(getErrorMessage(err));
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
          const pdf = await this.pdfService.generateHealthReportPdf(
            analysisResult,
            data,
            false,
          );

          const pdfDir = this.getPdfDirectory();
          this.ensureDirectoryExists(pdfDir);

          const filename = this.sanitizeFilename(`${jobId}.pdf`);
          const filepath = path.join(pdfDir, filename);

          fs.writeFileSync(filepath, pdf);

          this.pdfJobs.set(jobId, {
            status: PdfJobStatusEnum.COMPLETED,
            filename,
            createdAt: new Date(),
          });

          this.logger.log(`PDF generated successfully: ${filename}`);

          // Force garbage collection after PDF generation
          if (global.gc) {
            global.gc();
          }
        } catch (error) {
          this.logger.error('Background PDF generation failed:', error);

          this.pdfJobs.set(jobId, {
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

  private getPdfDirectory(): string {
    const dirName: string = PDF_DIR_NAME;
    return path.join(process.cwd(), dirName);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  private sanitizeFilename(filename: string): string {
    return path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  getPdfJobStatus(jobId: string): PdfJobStatus | null {
    if (!this.validateJobId(jobId)) {
      this.logger.warn(`Invalid job ID format: ${jobId}`);
      return null;
    }
    return this.pdfJobs.get(jobId) || null;
  }

  getPdfByJobId(jobId: string): Buffer | null {
    if (!this.validateJobId(jobId)) {
      this.logger.warn(`Invalid job ID format: ${jobId}`);
      return null;
    }

    const job = this.pdfJobs.get(jobId);

    if (!job || job.status !== PdfJobStatusEnum.COMPLETED || !job.filename) {
      return null;
    }

    try {
      const pdfDir = this.getPdfDirectory();
      const sanitizedFilename = this.sanitizeFilename(job.filename);
      const filepath = path.join(pdfDir, sanitizedFilename);

      const resolvedPath = path.resolve(filepath);
      const resolvedPdfDir = path.resolve(pdfDir);

      if (!resolvedPath.startsWith(resolvedPdfDir)) {
        this.logger.error(`Path traversal attempt detected: ${jobId}`);
        return null;
      }

      if (fs.existsSync(filepath)) {
        const buffer = fs.readFileSync(filepath);

        this.downloadedPdfs.add(jobId);

        setTimeout(() => {
          this.deletePdf(jobId);
        }, 5000);

        return buffer;
      }

      return null;
    } catch (error) {
      this.logger.error('Error reading PDF:', error);
      return null;
    }
  }

  private deletePdf(jobId: string): void {
    try {
      const job = this.pdfJobs.get(jobId);

      if (job && job.filename) {
        const pdfDir = this.getPdfDirectory();
        const sanitizedFilename = this.sanitizeFilename(job.filename);
        const filepath = path.join(pdfDir, sanitizedFilename);

        const resolvedPath = path.resolve(filepath);
        const resolvedPdfDir = path.resolve(pdfDir);

        if (!resolvedPath.startsWith(resolvedPdfDir)) {
          this.logger.error(`Path traversal attempt in delete: ${jobId}`);
          return;
        }

        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          this.logger.log(`PDF deleted: ${sanitizedFilename}`);
        }
      }

      this.pdfJobs.delete(jobId);
      this.downloadedPdfs.delete(jobId);
    } catch (error) {
      this.logger.error(`Error deleting PDF for job ${jobId}:`, error);
    }
  }

  private cleanupExpiredPdfs(): void {
    const now = Date.now();
    const expiredJobs: string[] = [];
    const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

    this.pdfJobs.forEach((job, jobId) => {
      const age = now - job.createdAt.getTime();

      // Delete immediately if already downloaded, or after 10 minutes
      if (this.downloadedPdfs.has(jobId) || age > MAX_AGE_MS) {
        expiredJobs.push(jobId);
      }
    });

    expiredJobs.forEach((jobId) => {
      this.deletePdf(jobId);
    });

    if (expiredJobs.length > 0) {
      this.logger.log(`Cleaned up ${expiredJobs.length} PDFs`);
    }

    // Force garbage collection after cleanup
    if (global.gc && expiredJobs.length > 0) {
      global.gc();
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
