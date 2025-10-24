import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { CreateOcrDto } from './dto/create.dto';
import { OcrService } from './orc.service';

@ApiTags('Ocr')
@Controller('ocr')
export class OcrController {
  constructor(private ocrService: OcrService) {}

  @Post('extract')
  async create(@Body() createOcrDto: CreateOcrDto): Promise<BloodTestData> {
    return this.ocrService.create(createOcrDto);
  }
}
