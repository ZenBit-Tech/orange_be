import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateMarkerDto {
  @ApiProperty({ example: 'cholesterol' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'cholesterol' })
  @IsNotEmpty()
  @IsString()
  key: string;

  @ApiProperty({ example: 'en' })
  @IsNotEmpty()
  @IsString()
  language: string;

  @ApiProperty({ example: 'Cholesterol[:\\s]*([\\d.,]+)' })
  @IsNotEmpty()
  @IsString()
  pattern: string;

  @ApiProperty({ example: 'lipids' })
  @IsNotEmpty()
  @IsString()
  category: string;

  @ApiProperty({ example: 'Total Cholesterol,Chol', required: false })
  @IsOptional()
  @IsString()
  alternativeNames?: string;

  @ApiProperty({ example: 'mmol/L', required: false })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 3.0, required: false })
  @IsOptional()
  @IsNumber()
  referenceMin?: number;

  @ApiProperty({ example: 5.2, required: false })
  @IsOptional()
  @IsNumber()
  referenceMax?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMarkerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  alternativeNames?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  referenceMin?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  referenceMax?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
