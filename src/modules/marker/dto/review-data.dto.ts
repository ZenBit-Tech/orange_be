import { MarkerData } from '@common/interfaces/review-analysis-data.interface';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
} from 'class-validator';

export class CreateReviewDataDto {
  @ApiProperty({ example: 2000 })
  @IsNotEmpty()
  @IsNumber()
  birthYear: number;

  @ApiProperty({ example: 'male' })
  @IsNotEmpty()
  @IsString()
  gender: string;

  @ApiProperty({ example: 'not-pregnant', required: false })
  @IsOptional()
  @IsString()
  pregnancy?: string | null;

  @ApiProperty({
    example: [
      {
        id: 1,
        name: 'Bilirubin (Total)',
        value: '4.8',
        unit: 'mg/dL',
        normalRange: '0.1 - 1.2 mg/dL',
        hasError: false,
      },
    ],
  })
  @IsNotEmpty()
  @IsArray()
  markersData: MarkerData[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  nutritionAdvice?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  supplementRecommendations?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  medicationGuidance?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  exerciseGuidelines?: boolean;

  @ApiProperty({ example: 'Why is my cholesterol high?', required: false })
  @IsOptional()
  @IsString()
  additionalQuestions?: string;
}
