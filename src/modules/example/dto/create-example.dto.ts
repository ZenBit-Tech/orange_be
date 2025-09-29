import { IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExampleDto {
  @ApiProperty({ example: 'Test name', description: 'The name of the example' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    example: 'example description...',
    description: 'Description input field',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
