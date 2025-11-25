import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { BloodTestService } from './bloodTest.service';

import type {
  BloodTestData,
  BloodTestValidation,
} from '@common/interfaces/blood-test-data.interface';
import { AuthGuard } from '@modules/auth/guards/auth.guard';
import { CreateReviewDataDto } from '@modules/marker/dto/review-data.dto';

@Controller('')
export class BloodTestController {
  constructor(private bloodTestService: BloodTestService) {}

  @UseGuards(AuthGuard)
  @Post('analyze')
  analyze(@Body() data: CreateReviewDataDto) {
    return this.bloodTestService.analyzeBloodTest(data);
  }

  @UseGuards(AuthGuard)
  @Post('validate-blood-test')
  isValid(@Body() data: BloodTestData): Promise<BloodTestValidation> {
    return this.bloodTestService.validateBloodTest(data);
  }
}
