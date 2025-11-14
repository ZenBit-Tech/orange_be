import * as fs from 'fs';
import * as path from 'path';
import { createWorker, PSM, RecognizeResult } from 'tesseract.js';
import sharp from 'sharp';
import { pdf } from 'pdf-to-img';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BloodTestData,
  MarkerValue,
} from '@common/interfaces/blood-test-data.interface';
import { BASE64_PATTERN } from '@common/constants';
import { MarkerService } from '@modules/marker/marker.service';
import { Marker } from '@modules/marker/entities/marker.entity';
import { CreateOcrDto } from './dto/create.dto';

interface LanguageKeywords {
  [key: string]: string[];
}

type FileType = 'png' | 'jpg' | 'jpeg' | 'pdf';

@Injectable()
export class OcrService {
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly logger = new Logger(OcrService.name);
  private readonly languageKeywords: LanguageKeywords = {
    uk: [
      'Холестерин',
      'Глюкоза',
      'Гемоглобін',
      'Еритроцити',
      'Лейкоцити',
      'Тромбоцити',
      'Креатинін',
      'Білірубін',
      'Аланін',
      'Аспартат',
      'Тригліцериди',
      'Загальний',
      'Прямий',
      'Непрямий',
      'ммоль',
    ],
    en: [
      'Cholesterol',
      'Glucose',
      'Hemoglobin',
      'Erythrocytes',
      'Leukocytes',
      'Platelets',
      'Creatinine',
      'Bilirubin',
      'Alanine',
      'Aspartate',
      'Triglycerides',
      'Total',
      'Direct',
      'Indirect',
      'HDL',
      'LDL',
      'VLDL',
      'mmol',
    ],
    pl: [
      'Cholesterol',
      'Glukoza',
      'Hemoglobina',
      'Erytrocyty',
      'Leukocyty',
      'Płytki',
      'Kreatynina',
      'Bilirubina',
      'Alanina',
      'Asparaginian',
      'Trójglicerydy',
      'Całkowity',
      'Bezpośredni',
      'mmol',
    ],
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly markerService: MarkerService,
  ) {
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') ||
      path.join(__dirname, '..', '..', 'uploads');
    this.maxFileSize =
      this.configService.get<number>('MAX_FILE_SIZE') || 31457280;
  }

  async create(createFileDto: CreateOcrDto): Promise<BloodTestData> {
    const { data } = createFileDto;

    this.validateBase64Input(data);

    const fileType = this.validateAndDetectFileType(data);

    const parts = data.split(';base64,');
    const base64Content = parts[1];

    const bufferSize = Buffer.from(base64Content, 'base64').length;
    if (bufferSize > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
      );
    }

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = fileType === 'pdf' ? 'pdf' : 'jpg';
    const filename = `upload_${timestamp}_${randomStr}.${extension}`;
    const filePath = path.join(this.uploadDir, filename);

    try {
      fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));

      let result: BloodTestData;

      if (fileType === 'pdf') {
        result = await this.processPdfFile(filePath);
      } else {
        result = await this.processImageFile(filePath);
      }

      this.cleanupTemporaryFiles(filePath);

      return result;
    } catch (error) {
      this.cleanupTemporaryFiles(filePath);

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error('OCR processing error:', error);
      throw new InternalServerErrorException(
        'Failed to extract blood test data',
      );
    }
  }

  private validateAndDetectFileType(data: string): FileType {
    if (!data || data.trim().length === 0) {
      throw new BadRequestException('File data cannot be empty');
    }

    const imagePattern = /^data:image\/(png|jpg|jpeg);base64,/i;
    const pdfPattern = /^data:application\/pdf;base64,/i;

    if (imagePattern.test(data)) {
      const match = data.match(imagePattern);
      return match[1].toLowerCase() as FileType;
    }

    if (pdfPattern.test(data)) {
      return 'pdf';
    }

    throw new BadRequestException(
      'Invalid file format. Supported formats: PNG, JPG, JPEG, PDF',
    );
  }

  private async processPdfFile(pdfPath: string): Promise<BloodTestData> {
    this.logger.log('Processing PDF file...');

    const allExtractedData: BloodTestData[] = [];
    const tempImagePaths: string[] = [];

    try {
      const document = await pdf(pdfPath, { scale: 2.0 });
      let pageNum = 0;

      for await (const image of document) {
        pageNum++;
        this.logger.log(`Processing page ${pageNum}`);

        const imagePath = pdfPath.replace('.pdf', `_page${pageNum}.png`);
        fs.writeFileSync(imagePath, image);
        tempImagePaths.push(imagePath);

        const pageData = await this.processImageFile(imagePath);
        allExtractedData.push(pageData);
      }

      this.logger.log(`PDF has ${pageNum} page(s)`);
    } finally {
      tempImagePaths.forEach((imgPath) => {
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
      });
    }

    return this.mergeBloodTestData(allExtractedData);
  }

  private async processImageFile(imagePath: string): Promise<BloodTestData> {
    const cleaned = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_clean.png');

    await sharp(imagePath)
      .grayscale()
      .normalise()
      .sharpen()
      .resize({ width: 3000 })
      .toFile(cleaned);

    this.logger.log('Preprocessing complete');

    const worker = await createWorker(['ukr', 'eng', 'pol'], 1);

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
    });

    const result: RecognizeResult = await worker.recognize(cleaned);
    await worker.terminate();

    const rawOcrPath = imagePath.replace(/\.(png|jpg|jpeg)$/i, '_ocr_raw.txt');
    fs.writeFileSync(rawOcrPath, result.data.text);

    this.logger.log('OCR complete');

    const detectedLanguage = this.detectLanguageFromText(result.data.text);

    const markers = await this.markerService.findByLanguage(detectedLanguage);

    if (markers.length === 0) {
      throw new InternalServerErrorException(
        `No markers found for language: ${detectedLanguage}`,
      );
    }

    this.logger.log(`Found ${markers.length} markers for ${detectedLanguage}`);

    const bloodTestData = this.parseBloodTestWithMarkers(
      result.data.text,
      markers,
    );

    if (fs.existsSync(cleaned)) {
      fs.unlinkSync(cleaned);
    }
    if (fs.existsSync(rawOcrPath)) {
      fs.unlinkSync(rawOcrPath);
    }

    return bloodTestData;
  }

  private mergeBloodTestData(dataArray: BloodTestData[]): BloodTestData {
    const merged: BloodTestData = {};

    for (const data of dataArray) {
      Object.keys(data).forEach((key) => {
        const value = data[key as keyof BloodTestData];

        if (value !== undefined) {
          (merged as string)[key] = value;
        }
      });
    }

    return merged;
  }

  private detectLanguageFromText(text: string): string {
    const scores: { [key: string]: number } = {};

    for (const lang of Object.keys(this.languageKeywords)) {
      scores[lang] = 0;
    }

    for (const [lang, keywords] of Object.entries(this.languageKeywords)) {
      for (const keyword of keywords) {
        const regex = new RegExp(keyword, 'gi');
        const matches = text.match(regex);
        if (matches) {
          scores[lang] += matches.length;
        }
      }
    }

    let maxScore = 0;
    let detectedLanguage = 'en';

    for (const [lang, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = lang;
      }
    }

    return detectedLanguage;
  }

  private parseBloodTestWithMarkers(
    text: string,
    markers: Marker[],
  ): BloodTestData {
    const data: BloodTestData = {};

    for (const marker of markers) {
      try {
        const pattern = new RegExp(marker.pattern, 'i');
        const match = text.match(pattern);

        if (match && match[1]) {
          const rawValue = match[1];
          const numValue = this.normalizeNumber(rawValue, marker.key);

          data[marker.key as keyof BloodTestData] = {
            value: numValue,
            unit: marker.unit,
            referenceMin: marker.referenceMin,
            referenceMax: marker.referenceMax,
          } as MarkerValue;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing marker ${marker.key}:`, errorMessage);
      }
    }

    return data;
  }

  private normalizeNumber(value: string, key: string): number {
    let normalized = value.replace(/\s+/g, '').replace(',', '.');

    if (/^\d+\.\d+$/.test(normalized)) {
      return parseFloat(normalized);
    }

    const needsDecimal = {
      lipids: [
        'triglycerides',
        'cholesterol',
        'hdl',
        'ldl',
        'vldl',
        'atherogenicCoeff',
      ],
      biochemSmall: ['glucose', 'totalBilirubin', 'directBilirubin'],
    };

    const isLipid = needsDecimal.lipids.includes(key);
    const isBiochemSmall = needsDecimal.biochemSmall.includes(key);

    if (!/[.,]/.test(normalized) && /^\d+$/.test(normalized)) {
      const num = parseInt(normalized, 10);

      if (isLipid && num >= 10) {
        normalized = (num / 100).toFixed(2);
      } else if (isBiochemSmall && num >= 100) {
        normalized = (num / 100).toFixed(2);
      }
    }

    return parseFloat(normalized);
  }

  private validateBase64Input(data: string): void {
    if (!data || data.trim().length === 0) {
      throw new BadRequestException('Image data cannot be empty');
    }

    if (!BASE64_PATTERN.test(data)) {
      throw new BadRequestException(
        'Invalid base64 format. Expected format: data:image/[png|jpg|jpeg];base64,[data] or data:application/pdf;base64,[data]',
      );
    }
  }

  private cleanupTemporaryFiles(basePath: string): void {
    const patterns = [
      basePath,
      basePath.replace(/\.(png|jpg|jpeg|pdf)$/i, '_clean.png'),
      basePath.replace(/\.(png|jpg|jpeg|pdf)$/i, '_ocr_raw.txt'),
    ];

    if (basePath.endsWith('.pdf')) {
      const basePathWithoutExt = basePath.replace('.pdf', '');
      const dir = path.dirname(basePath);

      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          if (
            file.startsWith(path.basename(basePathWithoutExt)) &&
            file.includes('_page')
          ) {
            const filePath = path.join(dir, file);
            try {
              fs.unlinkSync(filePath);
            } catch (error) {
              this.logger.error(`Failed to cleanup file ${filePath}:`, error);
            }
          }
        });
      }
    }

    for (const file of patterns) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        this.logger.error(`Failed to cleanup file ${file}:`, error);
      }
    }
  }
}
