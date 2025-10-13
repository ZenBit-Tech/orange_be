import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@modules/user/user.service';
import { User } from '@modules/user/entities/user.entity';
import { AuthResponseDto } from './dto/auth-response.dto';
import { OAuthProfileDto } from './dto/oauth-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UserService,
  ) {}
  async validateOAuthLogin(profile: OAuthProfileDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findOneBy({
      providers: { providerId: profile.providerId },
    });

    if (user) {
      return this.login(user);
    }

    const newUser = await this.usersService.create(profile);
    return this.login(newUser);
  }

  private login(user: User): AuthResponseDto {
    const payload = { id: user.id, email: user.email };

    const jwt = this.jwtService.sign(payload);

    return {
      accessToken: jwt,
      user,
    };
  }
}
