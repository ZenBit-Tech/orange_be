import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '@modules/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google-strategy';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { MagicLink } from './entities/magic-link.entity';
import { FacebookStrategy } from './strategies/facebook.strategy';

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
          expiresIn: parseInt(config.getOrThrow<string>('jwt.accessTokenTtl')),
        },
      }),
    }),
    forwardRef(() => UserModule),
    TypeOrmModule.forFeature([]),
  ],
  providers: [AuthService, GoogleStrategy, LinkedInStrategy, FacebookStrategy],
  controllers: [AuthController],
  exports: [JwtModule, TypeOrmModule],
})
export class AuthModule {}
