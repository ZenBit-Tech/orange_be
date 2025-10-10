import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { databaseConfig } from '@config/database.config';
import { AuthModule } from '@modules/auth/auth.module';
import googleOauthConfig from '@config/google-oauth.config';
import { UserModule } from '@modules/user/user.module';
import jwtConfig from '@config/jwt.config';
import { validate } from '@common/validation/env.validation';
import { RedisModule } from '@modules/redis/redis.module';
import { FilesModule } from './modules/files/files.module';
import redisConfig from '@config/redis.config';

type AppConfig = {
  database: ConfigType<typeof databaseConfig>;
};
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.development.local',
      load: [databaseConfig, googleOauthConfig, jwtConfig, redisConfig],
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
    RedisModule,
    AuthModule,
    FilesModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
