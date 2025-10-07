import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '@modules/auth/auth.service';
import { SendLinkDto } from '@modules/auth/dto/send-link.dto';
import { VerifyTokenResponseDto } from '@modules/auth/dto/verify-token-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('send-link')
    @ApiOperation({ summary: 'Send magic link to email' })
    @ApiResponse({ status: 200, description: 'Magic link sent', type: Object })
    @ApiResponse({ status: 400, description: 'Invalid email' })
    async sendMagicLink(@Body() body: SendLinkDto) {
        return this.authService.sendMagicLink(body.email);
    }

    @Get('verify')
    @ApiOperation({ summary: 'Verify magic link token' })
    @ApiResponse({ status: 200, description: 'Token verified', type: VerifyTokenResponseDto })
    @ApiResponse({ status: 401, description: 'Expired or invalid token' })
    async verifyToken(@Query('token') token: string, @Query('email') email: string) {
        return this.authService.verifyToken(token, email);
    }
}