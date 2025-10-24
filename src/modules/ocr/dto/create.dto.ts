import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOcrDto {
  @ApiProperty({
    description: 'Base64 encoded image data',
    example: 'image/png;base64,iVBORw0KGgoAAAANS...',
  })
  @IsNotEmpty()
  @IsString()
  data: string;
}
