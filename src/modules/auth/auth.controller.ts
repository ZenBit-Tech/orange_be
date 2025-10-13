import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { OAuthProfileDto } from './dto/oauth-profile.dto';

interface RequestWithUser extends Request {
  user: OAuthProfileDto;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

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
    return this.handleOAuthCallback(req, res);
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
  @UseGuards(AuthGuard('facebook'))
  @Get('facebook/callback')
  async facebookCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    return this.handleOAuthCallback(req, res);
  }

  private async handleOAuthCallback(
    req: RequestWithUser,
    res: Response,
  ): Promise<void> {
    const response = await this.authService.validateOAuthLogin(req.user);
    const url = this.configService.get<string>('FRONTEND_URL') + '/upload';

    res.cookie('jwt', response.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    res.redirect(url);
  }
}
