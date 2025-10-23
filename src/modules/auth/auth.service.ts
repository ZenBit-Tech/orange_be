import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { OAuthUserDto } from '@database/dtos/oauth-user.dto';
import { FacebookUserDto } from '@database/dtos/facebook-user.dto';
import { UserService } from '@modules/user/user.service';
import { CreateUserDto } from './dto/create-user-dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MagicLink } from './entities/magic-link.entity';
import { emailTemplate } from 'utils/emailTemplates/magicLink';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(MagicLink)
    private magicLinkRepository: Repository<MagicLink>,
    private jwtService: JwtService,
    private usersService: UserService,
    private configService: ConfigService,
  ) {
    const smtpTransport: SMTPTransport.Options = {
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    };

    this.transporter = nodemailer.createTransport(smtpTransport);
  }

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

  async sendMagicLink(email: string): Promise<{ message: string }> {
    try {
      let user = await this.usersService.findByEmail(email);

      if (!user) {
        user = await this.usersService.create({ email });
      }
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const magicLink = this.magicLinkRepository.create({
        user: user,
        token,
        expiresAt,
      });

      await this.magicLinkRepository.save(magicLink);

      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const magicLinkUrl = `${frontendUrl}/verify?token=${token}&email=${encodeURIComponent(email)}`;

      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to: email,
        subject: 'Your PlasmaAI access link',
        html: emailTemplate(magicLinkUrl),
      });

      return { message: `Sign-in link sent to ${email}` };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(`Failed to send email: ${error.message}`);
      }
      throw new BadRequestException('Failed to send email. Please try again.');
    }
  }

  async verifyToken(
    token: string,
    email: string,
  ): Promise<{ accessToken: string; email: string }> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (!user) {
        throw new UnauthorizedException('User not found!');
      }
      const magicLink = await this.magicLinkRepository.findOne({
        where: {
          user: { id: user.id },
          token,
        },
      });

      if (!magicLink) {
        throw new UnauthorizedException('Invalid token or email.');
      }

      if (new Date() > magicLink.expiresAt) {
        throw new UnauthorizedException(
          'Token was expired.Please request a new magic link',
        );
      }

      await this.magicLinkRepository.remove(magicLink);

      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken, email };
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(
          `Token verification failed: ${error.message}`,
        );
      }
      throw new BadRequestException(
        'Token verification failed. Please try again.',
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
