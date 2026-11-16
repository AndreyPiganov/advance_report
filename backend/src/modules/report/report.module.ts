import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../config/app-config.module';
import { ReportController } from './controllers/report.controller';
import { ReportDatePipe } from './pipes/report-date.pipe';
import { CsvReportRepository } from './repositories/csv-report.repository';
import { ReportRepository } from './repositories/report.repository';
import { ReportService } from './services/report.service';

@Module({
  imports: [AppConfigModule],
  controllers: [ReportController],
  providers: [
    ReportService,
    ReportDatePipe,
    { provide: ReportRepository, useClass: CsvReportRepository },
  ],
})
export class ReportModule {}
