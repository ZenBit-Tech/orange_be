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
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { OAuthUserDto } from '@database/dtos/oauth-user.dto';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  MagicLinkResponseDto,
  SendMagicLink,
} from './dto/auth-response.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LinkedInAuthGuard } from './guards/linkedin-auth.guard';
import { COOKIE_MAX_AGE } from '@common/constants';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { AuthGuard } from './guards/auth.guard';

interface RequestWithUser extends Request {
  user: OAuthUserDto;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiOperation({ summary: "Get the current user's profile" })
  getProfile(@Req() req: RequestWithUser) {
    return req.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('auth-token', '', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      expires: new Date(0),
    });
    return { message: 'Logged out' };
  }

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
    try {
      this.logger.log('Google callback received');

      if (!req.user) {
        this.logger.error('No user found in request');
        return res.redirect(
          `${this.configService.get<string>('FRONTEND_URL')}?error=no_user`,
        );
      }

      this.logger.log(`User authenticated: ${JSON.stringify(req.user)}`);

      const response = await this.authService.findOrCreateUser(
        req.user,
        'google',
      );

      const url = this.configService.get<string>('FRONTEND_URL');

      if (!url) throw new Error('FRONTEND_URL is not defined');

      const accessToken =
        response.accessToken ||
        this.jwtService.sign({
          email: req.user.email,
          sub: req.user.id,
        });

      res.cookie('auth-token', accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
      });

      this.logger.log('Google authentication successful, redirecting');
      res.redirect(`${url}/upload`);
    } catch (error) {
      this.logger.error('Google callback error:', error);
      const url = this.configService.get<string>('FRONTEND_URL');
      res.redirect(`${url}?error=auth_failed`);
    }
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
    @Res({ passthrough: true }) response: Response,
  ): Promise<MagicLinkResponseDto> {
    return this.authService.verifyToken(token, email, response);
  }
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

      const response = await this.authService.findOrCreateUser(
        req.user,
        'linkedin',
      );
      const url = this.configService.get<string>('FRONTEND_URL');

      if (!url) throw new Error('FRONTEND_URL is not defined');

      res.cookie('auth-token', response.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
      });

      this.logger.log('LinkedIn authentication successful, redirecting');
      res.redirect(`${url}/upload`);
    } catch (error) {
      this.logger.error('LinkedIn callback error:', error);
      const url = this.configService.get<string>('FRONTEND_URL');
      res.redirect(`${url}?error=auth_failed`);
    }
  }

  @UseGuards(FacebookAuthGuard)
  @Get('facebook/login')
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  facebookLogin() {
    this.logger.log('Facebook login initiated');
  }

  @ApiOperation({ summary: 'Facebook Auth callback' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated with Facebook',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @UseGuards(FacebookAuthGuard)
  @Get('facebook/callback')
  async facebookCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    try {
      this.logger.log('Facebook callback received');

      if (!req.user) {
        this.logger.error('No user found in request');
        return res.redirect(
          `${this.configService.get<string>('FRONTEND_URL')}?error=no_user`,
        );
      }

      this.logger.log(`User authenticated: ${JSON.stringify(req.user)}`);

      const response = await this.authService.validateOAuthFacebook(req.user);
      const url = this.configService.get<string>('FRONTEND_URL');

      if (!url) throw new Error('FRONTEND_URL is not defined');

      res.cookie('auth-token', response.accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
      });

      this.logger.log('Facebook authentication successful, redirecting');
      res.redirect(`${url}/upload`);
    } catch (error) {
      this.logger.error('Facebook callback error:', error);
      const url = this.configService.get<string>('FRONTEND_URL');
      res.redirect(`${url}?error=auth_failed`);
    }
  }
}
