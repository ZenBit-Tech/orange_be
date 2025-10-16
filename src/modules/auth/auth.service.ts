import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { GoogleUserDto } from '@database/dtos/google-user.dto';
import { LinkedinUserDto } from '@database/dtos/linkedin-user.dto';
import { UserService } from '@modules/user/user.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MagicLink } from './entities/magic-link.entity';
import { emailTemplate } from 'utils/emailTemplates/magicLink';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

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

  async sendMagicLink(email: string): Promise<{ message: string }> {
    let user = await this.usersService.findByEmail(email);

    if (!user) {
      user = await this.usersService.create({ email });
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const magicLink = this.magicLinkRepository.create({
      userId: user.id,
      token,
      expiresAt,
    });

    await this.magicLinkRepository.save(magicLink);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const magicLinkUrl = `${frontendUrl}/verify?token=${token}&email=${encodeURIComponent(email)}`;

    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to: email,
        subject: 'Your Magic Link',
        html: emailTemplate(magicLinkUrl),
      });

      return { message: `Sign-in link sent to ${email}` };
    } catch {
      throw new BadRequestException('Failed to send email. Please try again.');
    }
  }

  async verifyToken(
    token: string,
    email: string,
  ): Promise<{ accessToken: string; email: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found!');
    }
    const magicLink = await this.magicLinkRepository.findOne({
      where: {
        userId: user.id,
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
  }

  async validateOAuthLinkedIn(
    profile: LinkedinUserDto,
  ): Promise<AuthResponseDto> {
    let user = await this.usersService.findByLinkedInId(profile.id);

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
}
