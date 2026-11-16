import { Controller, Get, Query } from '@nestjs/common';
import { ReportService } from '../services/report.service';
import { ReportDatePipe } from '../pipes/report-date.pipe';
import type { ReportResponseDto } from '../dto/report-response.dto';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  getReport(@Query('date', ReportDatePipe) date: string): ReportResponseDto {
    return this.reportService.getReport(date);
  }
}
