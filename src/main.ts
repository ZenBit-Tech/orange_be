import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import session, { SessionOptions } from 'express-session';
import passport from 'passport';
import helmet from 'helmet';
import compression from 'compression';
import { COOKIE_SECURE } from '@common/constants';
import cookieParser from 'cookie-parser';
import { TransformInterceptor } from '@common/interceptors/transform.interceptor';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  app.use(cookieParser());

  app.use(bodyParser.json({ limit: '30mb' }));
  app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }));

  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      validateCustomDecorators: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('AI-Lab API')
    .setDescription('API documentation for AI-Lab project')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  app.use(helmet());

  app.use(compression());

  app.use(
    (session as (options?: SessionOptions) => any)({
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

  app.enableCors({
    origin: [configService.get<string>('FRONTEND_URL')],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`app started on PORT ${process.env.PORT ?? 3000}`);
}
void bootstrap();
