import { Injectable } from '@nestjs/common';
import { calculateReport } from '../domain/report-calculator';
import type { Report } from '../domain/report.types';
import { ReportRepository } from '../repositories/report.repository';

@Injectable()
export class ReportService {
  constructor(private readonly reportRepository: ReportRepository) {}

  getReport(reportDate: string): Report {
    return calculateReport(this.reportRepository.getDataset(), reportDate);
  }
}
