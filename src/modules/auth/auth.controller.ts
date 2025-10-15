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
  seGuards, Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';

import { COOKIE_MAX_AGE } from '@common/constants';

import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  MagicLinkResponseDto,
  SendMagicLink,
} from './dto/auth-response.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LinkedInAuthGuard } from './guards/linkedin.auth.guard';

interface User {
  id: string;
  email: string;
}

interface RequestWithUser extends Request {
  user: User;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

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
      maxAge: COOKIE_MAX_AGE,
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
  @UseGuards(LinkedInAuthGuard)
  @Get('linkedin/login')
  @ApiOperation({ summary: 'Initiate LinkedIn OAuth login' })
  linkedInLogin() {
    this.logger.log('LinkedIn login initiated');
  }

  @ApiOperation({ summary: 'LinkedIn Auth callback' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated with LinkedIn',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @UseGuards(LinkedInAuthGuard)
  @Get('linkedin/callback')
  async linkedInCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    try {
      this.logger.log('LinkedIn callback received');

      if (!req.user) {
        this.logger.error('No user found in request');
        return res.redirect(
          `${this.configService.get<string>('FRONTEND_URL')}?error=no_user`,
        );
      }

      this.logger.log(`User authenticated: ${JSON.stringify(req.user)}`);

      const response = await this.authService.validateOAuthLinkedIn(req.user);
      const url = this.configService.get<string>('FRONTEND_URL');

      if (!url) throw new Error('FRONTEND_URL is not defined');

      res.cookie('jwt', response.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24,
      });

      this.logger.log('LinkedIn authentication successful, redirecting');
      res.redirect(url);
    } catch (error) {
      this.logger.error('LinkedIn callback error:', error);
      const url = this.configService.get<string>('FRONTEND_URL');
      res.redirect(`${url}?error=auth_failed`);
    }
  }
}
