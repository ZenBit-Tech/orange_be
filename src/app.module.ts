import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { ExampleModule } from '@modules/example/example.module';
import { UserModule } from './modules/user/user.module';
import { GoogleStrategy } from '@modules/auth/strategies/google-strategy';
import googleOauthConfig from '@config/google-oauth.config';
import { AuthModule } from '@modules/auth/auth.module';

type AppConfig = {
  database: ConfigType<typeof databaseConfig>;
};
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, googleOauthConfig],
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

    ExampleModule,

    UserModule,

    AuthModule,
  ],
  providers: [GoogleStrategy],
})
export class AppModule {}
