import { Injectable, OnModuleInit } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDataset } from './dataset';
import { calculateReport } from './report-calculator';
import type { Dataset, ReportResponse } from './report.types';

@Injectable()
export class ReportService implements OnModuleInit {
  private dataset!: Dataset;

  async onModuleInit(): Promise<void> {
    const dataDirectory = resolve(process.cwd(), process.env.DATA_DIR ?? 'data');
    try {
      const [contracts, works, payments] = await Promise.all([
        readFile(resolve(dataDirectory, 'contracts.csv'), 'utf8'),
        readFile(resolve(dataDirectory, 'works.csv'), 'utf8'),
        readFile(resolve(dataDirectory, 'payments.csv'), 'utf8'),
      ]);
      this.dataset = parseDataset(contracts, works, payments);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Не удалось загрузить данные из ${dataDirectory}: ${detail}`);
    }
  }

  getReport(reportDate: string): ReportResponse {
    return calculateReport(this.dataset, reportDate);
  }
}
