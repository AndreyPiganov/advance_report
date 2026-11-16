import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDataset } from '../../src/modules/imports/parsers/csv/dataset.mapper';
import type { Dataset } from '../../src/common/domain/accounting.types';

export async function fixtureCsv(): Promise<[string, string, string]> {
  return Promise.all([
    readFile(resolve('data/contracts.csv'), 'utf8'),
    readFile(resolve('data/works.csv'), 'utf8'),
    readFile(resolve('data/payments.csv'), 'utf8'),
  ]);
}

export async function fixtureDataset(): Promise<Dataset> {
  return parseDataset(...await fixtureCsv());
}
