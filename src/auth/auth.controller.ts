import { Controller, Post, Body, Get, Param, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-verification')
  async sendVerification(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    // обязательно ждём результат
    return await this.authService.sendVerificationEmail(email);
  }

  @Get('verify/:token')
  async verify(@Param('token') token: string) {
    // обязательно ждём результат
    return await this.authService.verifyUser(token);
  }
}
