import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  const frontendDirectory = resolve(process.cwd(), process.env.FRONTEND_DIST_DIR ?? '../frontend/dist');
  if (existsSync(resolve(frontendDirectory, 'index.html'))) {
    app.useStaticAssets(frontendDirectory);
  }
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

void bootstrap();
