import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '@modules/user/user.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google-strategy';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { MagicLink } from './entities/magic-link.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([MagicLink]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.getOrThrow<string>('jwt.accessTokenTtl'),
        },
      }),
    }),
    forwardRef(() => UserModule),
  ],
  providers: [AuthService, GoogleStrategy, LinkedInStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
