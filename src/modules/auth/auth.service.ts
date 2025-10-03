import { GoogleUserDto } from '@database/dtos/google-user.dto';
import { UserService } from '@modules/user/user.service';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UserService,
  ) {}
  async validateOAuthLogin(profile: GoogleUserDto) {
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
}
