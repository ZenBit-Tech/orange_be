import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@modules/user/user.service';
import { GoogleUserDto } from '@database/dtos/google-user.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LinkedinUserDto } from '@database/dtos/linkedin-user.dto';
import { FacebookUserDto } from '@database/dtos/facebook-user.dto';
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UserService,
  ) {}
  async validateOAuthLogin(profile: GoogleUserDto): Promise<AuthResponseDto> {
    let user = await this.usersService.findByGoogleId(profile.id);
    if (!user) {
      user = await this.usersService.createGoogleUser(profile);
    }

    const payload = { sub: user.id, email: user.email };

    const jwt = this.jwtService.sign(payload);

    return {
      accessToken: jwt,
      user,
    };
  }

  async validateOAuthLinkedIn(
    profile: LinkedinUserDto,
  ): Promise<AuthResponseDto> {
    let user = await this.usersService.findByLinkedinEmail(profile.email);

    if (!user) {
      user = await this.usersService.createLinkedInUser(profile);
    }

    const payload = { sub: user.id, email: user.email };
    const jwt = this.jwtService.sign(payload);

    return {
      accessToken: jwt,
      user,
    };
  }

  async validateOAuthFacebook(
    profile: FacebookUserDto,
  ): Promise<AuthResponseDto> {
    let user = await this.usersService.findByFacebookId(profile.id);

    if (!user) {
      user = await this.usersService.createFacebookUser(profile);
    }

    const payload = { sub: user.id, email: user.email };
    const jwt = this.jwtService.sign(payload);

    return {
      accessToken: jwt,
      user,
    };
  }
}
