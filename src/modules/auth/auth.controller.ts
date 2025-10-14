import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  MagicLinkResponseDto,
  SendMagicLink,
} from './dto/auth-response.dto';

interface User {
  id: string;
  email: string;
}
interface RequestWithUser extends Request {
  user: User;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  googleLogin() {}

  @ApiOperation({ summary: 'Google Auth callback' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated with Google',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    const response = await this.authService.validateOAuthLogin(req.user);
    const url = this.configService.get<string>('FRONTEND_URL');

    if (!url) throw new Error('FRONTEND_URL is not defined');

    res.cookie('jwt', response.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    res.redirect(url);
  }

  @Post('send-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send magic link.',
    description:
      'Sends magic link to provided email address for passwordless authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Magic Link sent successfully.',
    schema: {
      example: { message: 'Magic link sent to your email.' },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid email or failed to send email.',
  })
  async sendMagicLink(@Body() sendMagicLinkDto: SendMagicLink) {
    return this.authService.sendMagicLink(sendMagicLinkDto.email);
  }

  @Get('verify')
  @ApiOperation({
    summary: 'Verify magic link token.',
    description:
      'Validates the magic link token and returns a JWT access token if valid.',
  })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Magic link token from email',
    example: '123token',
  })
  @ApiQuery({
    name: 'email',
    required: true,
    description: 'User email address',
    example: 'user@example.com',
  })
  @ApiResponse({
    status: 200,
    description: 'Token verified successfully,JWT returned',
    type: MagicLinkResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Unauthorized - invalid token or expired token',
  })
  async verifyToken(
    @Query('token') token: string,
    @Query('email') email: string,
  ): Promise<MagicLinkResponseDto> {
    return this.authService.verifyToken(token, email);
  }
}
