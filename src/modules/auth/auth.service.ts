import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@modules/user/user.service';
import { OAuthUserDto } from '@database/dtos/oauth-user.dto';
import { CreateUserDto } from './dto/create-user-dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { FacebookUserDto } from '@database/dtos/facebook-user.dto';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private jwtService: JwtService,
    private usersService: UserService,
  ) {}
  async findOrCreateUser(
    profile: OAuthUserDto,
    provider: 'google' | 'linkedin',
  ): Promise<AuthResponseDto> {
    try {
      if (!profile.email) {
        this.logger.warn(
          `OAuth profile missing email for provider:${provider}.`,
          profile,
        );
        throw new BadRequestException('Email not found in OAuth profile.');
      }
      this.logger.log(
        `Validating OAuth user:${profile.email} from ${provider}`,
      );
      let user = await this.usersService.findByEmail(profile.email);
      const providedIdField = provider === 'google' ? 'googleId' : 'linkedinId';

      if (user) {
        this.logger.log(`User found by email:${user.email}`);

        if (!user[providedIdField]) {
          this.logger.log(`Linking new provider ${provider} to existing user.`);
          user[providedIdField] = profile.id;
          user = await this.usersService.update(user);
        }
      } else {
        this.logger.log(
          `No user found. Creating new user for ${profile.email}.`,
        );

        const createUser: CreateUserDto = {
          email: profile.email,
          fullName: profile.fullName,
          googleId: provider === 'google' ? profile.id : undefined,
          linkedinId: provider === 'linkedin' ? profile.id : undefined,
        };
        user = await this.usersService.create(createUser);
      }

      const payload = { sub: user.id, email: user.email };

      const jwt = this.jwtService.sign(payload);

      return {
        accessToken: jwt,
        user,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to find or create user:${error.message}.`,
          error.stack,
        );
      }
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An error occured during authentication.',
      );
    }
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
