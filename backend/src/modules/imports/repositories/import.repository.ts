import type { Dataset } from '../../../common/domain/accounting.types';
import type { ImportResult } from '../domain/import-result';

export abstract class ImportRepository {
  abstract hasCsvImport(): Promise<boolean>;
  abstract saveCsv(dataset: Dataset, onlyIfUninitialized: boolean): Promise<ImportResult | null>;
}
