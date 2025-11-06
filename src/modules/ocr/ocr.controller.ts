import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { AuthGuard } from '@modules/auth/guards/auth.guard';
import { CreateOcrDto } from './dto/create.dto';
import { OcrService } from './orc.service';
@ApiTags('Ocr')
@Controller('ocr')
export class OcrController {
  constructor(private ocrService: OcrService) {}

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Extraction text from image' })
  @ApiResponse({
    status: 201,
    description: 'successfully received object json with data',
  })
  @Post('extract')
  async create(@Body() createOcrDto: CreateOcrDto): Promise<BloodTestData> {
    return this.ocrService.create(createOcrDto);
  }
}
