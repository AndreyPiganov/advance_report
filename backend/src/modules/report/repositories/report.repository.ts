import type { Dataset } from '../domain/report.types';

export abstract class ReportRepository {
  abstract getDataset(): Promise<Dataset>;
}
