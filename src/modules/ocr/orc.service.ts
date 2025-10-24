import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Body,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { extractBloodTestData } from '@modules/ocr';
import { BloodTestData } from '@common/interfaces/blood-test-data.interface';
import { CreateOcrDto } from './dto/create.dto';
import { BASE64_PATTERN } from '@common/constants';

@Injectable()
export class OcrService {
  async create(@Body() createFileDto: CreateOcrDto): Promise<BloodTestData> {
    const { data } = createFileDto;

    this.validateBase64Input(data);

    const parts = data.split(';base64,');
    const base64Image = parts[1];

    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const hash = Math.random() * 1000;
    const filePath = path.join(uploadDir, `output${hash}.png`);
    try {
      fs.writeFileSync(filePath, Buffer.from(base64Image, 'base64'));

      const rawData = await extractBloodTestData(filePath);
      this.cleanupTemporaryFiles(filePath);

      return rawData;
    } catch (error) {
      this.cleanupTemporaryFiles(filePath);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to extract blood test data',
      );
    }
  }

  private validateBase64Input(data: string): void {
    if (!data || data.trim().length === 0) {
      throw new BadRequestException('Image data cannot be empty');
    }

    if (!BASE64_PATTERN.test(data)) {
      throw new BadRequestException(
        'Invalid base64 image format. Expected format: data:image/[png|jpg|jpeg];base64,[data]',
      );
    }
  }

  private cleanupTemporaryFiles(basePath: string): void {
    const filesToClean = [
      basePath,
      basePath.replace('.png', '_clean.png'),
      basePath.replace('.png', '_ocr_raw.txt'),
    ];

    for (const file of filesToClean) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.error(`Failed to cleanup file ${file}:`, error);
      }
    }
  }
}
