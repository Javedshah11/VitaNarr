import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const corsOrigins = config.getOrThrow<string>('CORS_ORIGINS').split(',');

  app.use(helmet());
  app.enableCors({
    credentials: true,
    origin: corsOrigins.map((origin) => origin.trim()),
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableShutdownHooks();

  if (config.get<boolean>('ENABLE_API_DOCS')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('VitaNarr API')
      .setDescription('VitaNarr application API')
      .setVersion('0.1.0')
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  await app.listen(
    config.getOrThrow<number>('API_PORT'),
    config.getOrThrow<string>('API_HOST'),
  );
}

await bootstrap();
