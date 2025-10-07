import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendLinkDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address' })
    @IsString()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]{3,}$/, { message: 'Please enter a valid email' })
    email: string;
}