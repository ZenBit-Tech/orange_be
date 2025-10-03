import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './user.schema';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async sendVerificationEmail(email: string) {
    // генерируем новый токен
    const token = randomBytes(32).toString('hex');

    // ищем пользователя
    let user = await this.userModel.findOne({ email });

    if (!user) {
      user = new this.userModel({ email, verificationToken: token });
    } else {
      user.verificationToken = token;
    }

    await user.save();

    // создаем транспортер для Brevo SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, 
      auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_PASS,
      },
    });

    const verifyUrl = `http://localhost:5173/verify/${token}`;

    const mailOptions = {
      from: `"PlasmAI" <${process.env.SMTP_LOGIN}>`,
      to: email,
      subject: 'Verify your email',
      html: `Click <a href="${verifyUrl}">here</a> to verify your email.`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Verification email sent to ${email}`);
    } catch (err) {
      console.error(`Failed to send verification email to ${email}:`, err);
      throw new Error('Failed to send verification email');
    }

    return { message: 'Check your email to verify your account.' };
  }

  async verifyUser(token: string) {
    const user = await this.userModel.findOne({ verificationToken: token });
    if (!user) {
      throw new NotFoundException('Invalid verification token');
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    const payload = { sub: user._id, email: user.email };
    const access_token = this.jwtService.sign(payload, { expiresIn: '24h' });

    return { access_token, user };
  }
}