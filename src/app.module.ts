import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { databaseConfig } from '@config/database.config';
import { AuthModule } from '@modules/auth/auth.module';
import { GoogleStrategy } from '@modules/auth/strategies/google-strategy';
import googleOauthConfig from '@config/google-oauth.config';
import { UserModule } from '@modules/user/user.module';
import jwtConfig from '@config/jwt.config';
import { validate } from '@common/validation/env.validation';

type AppConfig = {
  database: ConfigType<typeof databaseConfig>;
};
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.development.local',
      load: [databaseConfig, googleOauthConfig, jwtConfig],
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
  ],
  providers: [GoogleStrategy],
  controllers: [],
})
export class AppModule {}
