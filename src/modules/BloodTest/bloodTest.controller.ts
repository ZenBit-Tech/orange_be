import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
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
import { AiAnalysisResult } from '@common/interfaces/analysis-result.interface';
import { PDF_HEADERS } from '@common/constants';

@ApiTags('blood-test')
@ApiBearerAuth()
@Controller('')
export class BloodTestController {
  constructor(private readonly bloodTestService: BloodTestService) {}

  @UseGuards(AuthGuard)
  @Post('analyze')
  @ApiOperation({ summary: 'Analyze blood test results' })
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
  @Post('generate-pdf')
  @ApiOperation({ summary: 'Generate PDF from analysis results' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        testResults: { type: 'object' },
        analysisResult: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async generatePdf(
    @Body()
    body: {
      testResults: CreateReviewDataDto;
      analysisResult: AiAnalysisResult;
    },
    @Res() res: Response,
  ): Promise<void> {
    const pdf = await this.bloodTestService.generatePdf(
      body.testResults,
      body.analysisResult,
    );

    res.set({
      'Content-Type': PDF_HEADERS.CONTENT_TYPE,
      'Content-Disposition': `attachment; filename=${PDF_HEADERS.FILENAME}`,
      'Content-Length': pdf.length,
    });

    res.end(pdf);
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
}
