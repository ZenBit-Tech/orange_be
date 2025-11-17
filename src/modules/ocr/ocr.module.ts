import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarkerModule } from '@modules/marker/marker.module';
import { OcrController } from './ocr.controller';
import { OcrService } from './ocr.service';
import { BloodTestModule } from '@modules/BloodTest/bloodTest.module';

@Module({
  imports: [ConfigModule, MarkerModule, BloodTestModule],
  controllers: [OcrController],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
