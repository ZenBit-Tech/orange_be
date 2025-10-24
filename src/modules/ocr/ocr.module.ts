import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { OcrController } from './ocr.controller';
import { OcrService } from './orc.service';

@Module({
  imports: [AuthModule],
  controllers: [OcrController],
  providers: [OcrService],
})
export class OcrModule {}
