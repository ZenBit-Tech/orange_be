import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarkerModule } from '@modules/marker/marker.module';
import { OcrController } from './ocr.controller';
import { OcrService } from './orc.service';

@Module({
  imports: [ConfigModule, MarkerModule],
  controllers: [OcrController],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
