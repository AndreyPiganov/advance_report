import { Injectable } from '@nestjs/common';
import { calculateReport } from '../domain/report-calculator';
import type { Report } from '../domain/report.types';
import { ReportRepository } from '../repositories/report.repository';

@Injectable()
export class ReportService {
  constructor(private readonly reportRepository: ReportRepository) {}

  async getReport(reportDate: string): Promise<Report> {
    return calculateReport(await this.reportRepository.getDataset(), reportDate);
  }
}
