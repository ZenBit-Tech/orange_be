import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ProviderEnum } from '@common/enums/providers.enums';

export class OAuthProfileDto {
  @ApiProperty({ description: "The user's unique ID from the provider." })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({
    description: 'The name of the OAuth provider.',
    example: 'facebook',
  })
  @IsString()
  @IsNotEmpty()
  provider: ProviderEnum;

  @ApiProperty({ description: 'The user email address.' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The last name of the user.' })
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiProperty({ description: 'The last name of the user.' })
  @IsString()
  @IsOptional()
  last_name?: string;
}
