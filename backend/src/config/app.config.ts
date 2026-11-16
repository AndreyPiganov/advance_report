import { Injectable } from '@nestjs/common';
import { resolve } from 'node:path';

@Injectable()
export class AppConfig {
  readonly port: number;
  readonly dataDirectory: string;
  readonly frontendDirectory: string;
  readonly databaseUrl: string;
  readonly importCron: string;
  readonly importTimeZone: string;

  constructor() {
    const port = process.env.PORT ?? '3000';
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
      throw new Error('PORT: ожидается целое число от 1 до 65535');
    }
    this.port = Number(port);
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL обязателен: приложение работает с PostgreSQL');
    try {
      const protocol = new URL(databaseUrl).protocol;
      if (protocol !== 'postgres:' && protocol !== 'postgresql:') throw new Error();
    } catch {
      throw new Error('DATABASE_URL: ожидается строка подключения PostgreSQL');
    }
    this.databaseUrl = databaseUrl;
    this.dataDirectory = resolve(process.cwd(), process.env.DATA_DIR ?? 'data');
    this.frontendDirectory = resolve(process.cwd(), process.env.FRONTEND_DIST_DIR ?? '../frontend/dist');
    this.importCron = process.env.IMPORT_CRON ?? '0 * * * *';
    this.importTimeZone = process.env.IMPORT_TIME_ZONE ?? 'Europe/Moscow';
  }
}
