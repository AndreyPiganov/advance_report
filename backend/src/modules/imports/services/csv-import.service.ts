import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppConfig } from '../../../config/app.config';
import { parseDataset } from '../parsers/csv/dataset.mapper';
import { ImportRepository } from '../repositories/import.repository';
import type { ImportResult } from '../domain/import-result';
import type { Dataset } from '../../../common/domain/accounting.types';

@Injectable()
export class CsvImportService {
  constructor(private readonly config: AppConfig, private readonly repository: ImportRepository) {}

  async initialize(): Promise<ImportResult | null> {
    if (await this.repository.hasCsvImport()) return null;
    return this.importFromFiles(true);
  }

  async importFromFiles(onlyIfUninitialized = false): Promise<ImportResult | null> {
    const directory = this.config.dataDirectory;
    let contents: [string, string, string];
    try {
      contents = await Promise.all([
        readFile(join(directory, 'contracts.csv'), 'utf8'),
        readFile(join(directory, 'works.csv'), 'utf8'),
        readFile(join(directory, 'payments.csv'), 'utf8'),
      ]);
    } catch (error) {
      throw new ServiceUnavailableException(`Не удалось прочитать CSV из ${directory}: ${error instanceof Error ? error.message : String(error)}`);
    }
    let dataset: Dataset;
    try { dataset = parseDataset(...contents); }
    catch (error) {
      throw new BadRequestException(`Некорректные CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
    return this.repository.saveCsv(dataset, onlyIfUninitialized);
  }
}
