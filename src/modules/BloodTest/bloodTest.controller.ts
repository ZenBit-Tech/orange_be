import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  Param,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { BloodTestService } from './bloodTest.service';
import type {
  BloodTestData,
  BloodTestValidation,
} from '@common/interfaces/blood-test-data.interface';
import { AuthGuard } from '@modules/auth/guards/auth.guard';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';
import { Response } from 'express';
import {
  AiAnalysisResult,
  PdfJobStatus,
  PdfJobStatusEnum,
} from '@common/interfaces/analysis-result.interface';

const ERROR_MESSAGES = {
  PDF_JOB_NOT_FOUND: 'PDF job not found',
  PDF_STILL_GENERATING: 'PDF is still being generated',
  PDF_GENERATION_FAILED: 'PDF generation failed',
  PDF_NOT_FOUND_OR_EXPIRED: 'PDF file not found or expired',
  INVALID_JOB_ID: 'Invalid job ID format',
} as const;

const PDF_HEADERS = {
  CONTENT_TYPE: 'application/pdf',
  FILENAME: 'health-report.pdf',
} as const;

@ApiTags('blood-test')
@ApiBearerAuth()
@Controller('')
export class BloodTestController {
  constructor(private readonly bloodTestService: BloodTestService) {}

  @UseGuards(AuthGuard)
  @Post('analyze')
  @ApiOperation({ summary: 'Analyze blood test results and generate report' })
  @ApiBody({ type: CreateReviewDataDto })
  @ApiResponse({
    status: 200,
    description: 'Analysis completed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  analyze(@Body() data: CreateReviewDataDto): Promise<AiAnalysisResult> {
    return this.bloodTestService.analyzeBloodTest(data);
  }

  @UseGuards(AuthGuard)
  @Post('validate-blood-test')
  @ApiOperation({ summary: 'Validate if uploaded data is a valid blood test' })
  @ApiBody({ type: Object })
  @ApiResponse({
    status: 200,
    description: 'Validation completed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  isValid(@Body() data: BloodTestData): Promise<BloodTestValidation> {
    return this.bloodTestService.validateBloodTest(data);
  }

  @UseGuards(AuthGuard)
  @Get('pdf-status/:jobId')
  @ApiOperation({ summary: 'Check PDF generation status' })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job ID returned from analyze endpoint',
    example: 'pdf_1234567890_abc123def',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF job status retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'PDF job not found' })
  getPdfStatus(@Param('jobId') jobId: string): PdfJobStatus {
    const status = this.bloodTestService.getPdfJobStatus(jobId);

    if (!status) {
      throw new NotFoundException(ERROR_MESSAGES.PDF_JOB_NOT_FOUND);
    }

    return status;
  }

  @UseGuards(AuthGuard)
  @Get('download-pdf/:jobId')
  @ApiOperation({ summary: 'Download generated PDF report' })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job ID returned from analyze endpoint',
    example: 'pdf_1234567890_abc123def',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF file downloaded successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 400,
    description: 'PDF still generating or generation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'PDF job not found or PDF file expired',
  })
  downloadPdf(@Param('jobId') jobId: string, @Res() res: Response): void {
    const status = this.bloodTestService.getPdfJobStatus(jobId);

    if (!status) {
      throw new NotFoundException(ERROR_MESSAGES.PDF_JOB_NOT_FOUND);
    }

    if (status.status === PdfJobStatusEnum.PENDING) {
      throw new BadRequestException(ERROR_MESSAGES.PDF_STILL_GENERATING);
    }

    if (status.status === PdfJobStatusEnum.FAILED) {
      throw new BadRequestException(
        `${ERROR_MESSAGES.PDF_GENERATION_FAILED}: ${status.error}`,
      );
    }

    const pdf = this.bloodTestService.getPdfByJobId(jobId);

    if (!pdf) {
      throw new NotFoundException(ERROR_MESSAGES.PDF_NOT_FOUND_OR_EXPIRED);
    }

    res.set({
      'Content-Type': PDF_HEADERS.CONTENT_TYPE,
      'Content-Disposition': `attachment; filename=${PDF_HEADERS.FILENAME}`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
  }
}
