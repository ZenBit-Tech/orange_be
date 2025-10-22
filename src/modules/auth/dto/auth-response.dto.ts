import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { User } from '@modules/user/entities/user.entity';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: () => User })
  user: User;
}

export class SendMagicLink {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address.',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyTokenDto {
  @ApiProperty({ example: 'token123', description: 'Magic link token.' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class MagicLinkResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token.',
  })
  accessToken: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address.',
  })
  email: string;
}
