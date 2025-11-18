import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { BloodTestModule } from '@modules/BloodTest/bloodTest.module';
import { databaseConfig } from '@config/database.config';
import googleOauthConfig from '@config/google-oauth.config';
import facebookOauthConfig from '@config/facebook-oauth.config';
import jwtConfig from '@config/jwt.config';
import { validate } from '@common/validation/env.validation';
import linkedinAuth from '@config/linkedin-oauth.config';
import { OcrModule } from '@modules/ocr/ocr.module';

type AppConfig = {
  database: ConfigType<typeof databaseConfig>;
};

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        databaseConfig,
        googleOauthConfig,
        jwtConfig,
        facebookOauthConfig,
        linkedinAuth,
      ],
      validate,
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig>): TypeOrmModuleOptions => {
        const dbConfig =
          config.getOrThrow<ConfigType<typeof databaseConfig>>('database');
        return dbConfig;
      },
    }),
    UserModule,
    AuthModule,
    OcrModule,
    BloodTestModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  controllers: [],
})
export class AppModule {}
