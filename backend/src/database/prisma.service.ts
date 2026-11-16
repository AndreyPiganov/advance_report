import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AppConfig } from '../config/app.config';
import type { PrismaClient } from '../generated/prisma/client';
import { createPrismaClient } from './prisma-client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(config: AppConfig) {
    this.client = createPrismaClient(config.databaseUrl);
  }

  async onModuleInit(): Promise<void> { await this.client.$connect(); }
  async onModuleDestroy(): Promise<void> { await this.client.$disconnect(); }
  async checkHealth(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }
}
