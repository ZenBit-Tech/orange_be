import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthService } from './auth.service';

interface User {
  id: string;
  email: string;
}
interface RequestWithUser extends Request {
  user: User;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  googleLogin() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback(@Req() req: RequestWithUser) {
    return this.authService.validateOAuthLogin(req.user);
  }
}
