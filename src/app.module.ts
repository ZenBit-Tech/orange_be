import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { databaseConfig } from '@config/database.config';
import googleOauthConfig from '@config/google-oauth.config';
import jwtConfig from '@config/jwt.config';
import facebookOauthConfig from '@config/facebook-oauth.config';
import { validate } from '@common/validation/env.validation';
import linkedinAuth from '@config/linkedin-oauth.config';
import { FilesModule } from './modules/files/files.module';

type AppConfig = {
  database: ConfigType<typeof databaseConfig>;
};
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [
        databaseConfig,
        googleOauthConfig,
        jwtConfig,
        linkedinAuth,
        facebookOauthConfig,
      ],
      validate,
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
    FilesModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
