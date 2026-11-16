import { parseCsv } from './csv.parser';
import { DATA_COLUMNS, validateDatasetRows } from '../../../../common/validation/dataset.validator';
import type { Dataset } from '../../../../common/domain/accounting.types';

export function parseDataset(contracts: string, works: string, payments: string): Dataset {
  return validateDatasetRows(
    parseCsv(contracts, 'contracts.csv', DATA_COLUMNS.contracts),
    parseCsv(works, 'works.csv', DATA_COLUMNS.works),
    parseCsv(payments, 'payments.csv', DATA_COLUMNS.payments),
  );
}
