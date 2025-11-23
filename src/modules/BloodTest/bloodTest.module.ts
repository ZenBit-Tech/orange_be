import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BloodTestController } from './bloodTest.controller';
import { BloodTestService } from './bloodTest.service';
import { PdfService } from './pdf.service';

@Module({
  imports: [ConfigModule],
  controllers: [BloodTestController],
  providers: [
    {
      provide: OpenAI,
      useFactory: (configService: ConfigService) => {
        return new OpenAI({
          apiKey: configService.get<string>('OPENAI_API_KEY'),
        });
      },
      inject: [ConfigService],
    },
    BloodTestService,
    PdfService,
  ],
  exports: [BloodTestService, PdfService],
})
export class BloodTestModule {}
