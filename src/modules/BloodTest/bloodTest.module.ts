import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BloodTestController } from './bloodTest.controller';
import { BloodTestService } from './bloodTest.service';

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
  ],
  exports: [BloodTestService],
})
export class BloodTestModule {}
