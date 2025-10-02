import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class GoogleUserDto {
  @ApiProperty({
    example: '6a88ffc6-f771-4d13-849f-f0dc42872980',
    description: 'Google user ID',
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
  email: string;

  @ApiProperty({
    example: 'Ivan Ivanov',
    description: 'Full name of the user',
  })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiProperty({
    example:
      'https://lh3.googleusercontent.com/a/ACg8ocJ2pvGMJDYUDa9RWpwtMJO5mahSuuSNN-4qHJc8pRRkXcvNfQ=s96-c',
    description: 'User avatar URL',
  })
  @IsUrl()
  @IsOptional()
  avatar?: string;
}
