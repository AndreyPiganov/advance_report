import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppConfig } from '../../../config/app.config';
import type { Dataset } from '../domain/report.types';
import { parseDataset } from './csv/dataset.mapper';
import { ReportRepository } from './report.repository';

@Injectable()
export class CsvReportRepository extends ReportRepository implements OnModuleInit {
  private dataset!: Dataset;

  constructor(private readonly config: AppConfig) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const directory = this.config.dataDirectory;
    try {
      const [contracts, works, payments] = await Promise.all([
        readFile(join(directory, 'contracts.csv'), 'utf8'),
        readFile(join(directory, 'works.csv'), 'utf8'),
        readFile(join(directory, 'payments.csv'), 'utf8'),
      ]);
      this.dataset = parseDataset(contracts, works, payments);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Не удалось загрузить данные из ${directory}: ${message}`);
    }
  }

  getDataset(): Dataset {
    return this.dataset;
  }
}
