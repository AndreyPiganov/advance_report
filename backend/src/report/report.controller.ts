import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import type { ReportResponse } from './report.types';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  getReport(@Query('date') date?: string): ReportResponse {
    if (!date) throw new BadRequestException('Параметр date обязателен; формат: YYYY-MM-DD');
    try {
      return this.reportService.getReport(date);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Некорректная дата отчёта';
      throw new BadRequestException(message);
    }
  }
}
