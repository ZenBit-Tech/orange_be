import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import session from 'express-session';
import passport from 'passport';
import { COOKIE_SECURE } from '@common/constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('AI-Lab API')
    .setDescription('API documentation for AI-Lab project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'someRandomSecret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: COOKIE_SECURE },
    }),
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user: Express.User, done) => done(null, user));

  app.use(passport.initialize());
  app.use(passport.session());

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`app started on PORT ${process.env.PORT ?? 3000}`);
}

void bootstrap();
