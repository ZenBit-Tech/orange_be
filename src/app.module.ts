import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ExampleModule } from '@modules/example/example.module';
import { AuthModule } from './auth/auth.module'; // если у тебя уже есть модуль авторизации

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Подключаем MongoDB
    MongooseModule.forRoot(process.env.MONGODB_URI),

    ExampleModule,
    AuthModule,
  ],
})
export class AppModule {}
