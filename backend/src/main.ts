import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(AppConfig);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  if (existsSync(`${config.frontendDirectory}/index.html`)) {
    app.useStaticAssets(config.frontendDirectory);
  }
  await app.listen(config.port, '0.0.0.0');
}

void bootstrap();
