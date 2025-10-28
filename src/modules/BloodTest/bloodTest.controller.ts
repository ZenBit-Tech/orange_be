import { Body, Controller, Post } from '@nestjs/common';
import { BloodTestService } from './bloodTest.service';
import type {
  BloodTestData,
  BloodTestValidation,
} from '@common/interfaces/blood-test-data.interface';

@Controller('')
export class BloodTestController {
  constructor(private bloodTestService: BloodTestService) {}

  @Post('validate-blood-test')
  isValid(@Body() data: BloodTestData): Promise<BloodTestValidation> {
    return this.bloodTestService.validateBloodTest(data);
  }
}
