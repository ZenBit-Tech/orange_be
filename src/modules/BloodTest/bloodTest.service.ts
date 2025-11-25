import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { BloodTestValidation } from '@common/interfaces/blood-test-data.interface';
import {
  getBloodTestAnalysisPrompt,
  getValidationPrompt,
  AI_MODEL,
  AI_TEMPERATURE,
  MAX_VALIDATION_TOKENS,
  PDF_DIR_NAME,
  PDF_EXPIRY_MS,
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
  private readonly logger = new Logger(BloodTestService.name);
  private readonly pdfJobs: Map<string, PdfJobStatus> = new Map();

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
      const prompt = getBloodTestAnalysisPrompt(testResults);
      const completion = await this.openAI.chat.completions.create({
        model: AI_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: AI_TEMPERATURE,
        max_tokens: 8000,
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

      const pdfJobId = this.generateJobId();

      this.pdfJobs.set(pdfJobId, {
        status: PdfJobStatusEnum.PENDING,
        createdAt: new Date(),
      });

      this.generatePdfInBackground(testResults, parsed, pdfJobId);

      return {
        ...parsed,
        pdfJobId,
      };
    } catch (error) {
      this.logger.error('AI Analysis Failed:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`AI Analysis Failed: ${errorMessage}`);
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

          const expiryTime: number = PDF_EXPIRY_MS;
          setTimeout(() => {
            this.deletePdf(jobId);
          }, expiryTime);
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
        return fs.readFileSync(filepath);
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
    } catch (error) {
      this.logger.error(`Error deleting PDF for job ${jobId}:`, error);
    }
  }

  private cleanupExpiredPdfs(): void {
    const now = Date.now();
    const expiredJobs: string[] = [];
    const expiryMs: number = PDF_EXPIRY_MS;

    this.pdfJobs.forEach((job, jobId) => {
      const age = now - job.createdAt.getTime();
      if (age > expiryMs) {
        expiredJobs.push(jobId);
      }
    });

    expiredJobs.forEach((jobId) => {
      this.deletePdf(jobId);
    });

    if (expiredJobs.length > 0) {
      this.logger.log(`Cleaned up ${expiredJobs.length} expired PDFs`);
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
