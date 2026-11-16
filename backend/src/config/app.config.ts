import { Injectable } from '@nestjs/common';
import { resolve } from 'node:path';

@Injectable()
export class AppConfig {
  readonly port: number;
  readonly dataDirectory: string;
  readonly frontendDirectory: string;

  constructor() {
    const port = process.env.PORT ?? '3000';
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
      throw new Error('PORT: ожидается целое число от 1 до 65535');
    }
    this.port = Number(port);
    this.dataDirectory = resolve(process.cwd(), process.env.DATA_DIR ?? 'data');
    this.frontendDirectory = resolve(process.cwd(), process.env.FRONTEND_DIST_DIR ?? '../frontend/dist');
  }
}
