import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LinkedinUserDto {
  @ApiProperty({
    example: '6a88ffc6-f771-4d13-849f-f0dc42872980',
    description: 'Linkedin user ID',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    example: 'user@gmail.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiProperty({
    example: 'Ivan Ivanov',
    description: 'Full name of the user',
  })
  @IsString()
  @IsOptional()
  fullName?: string;
}
