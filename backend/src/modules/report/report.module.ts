import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ReportController } from './controllers/report.controller';
import { ReportRepository } from './repositories/report.repository';
import { ReportService } from './services/report.service';
import { PrismaReportRepository } from './repositories/prisma-report.repository';

@Module({
  imports: [PrismaModule],
  controllers: [ReportController],
  providers: [
    ReportService,
    { provide: ReportRepository, useClass: PrismaReportRepository },
  ],
})
export class ReportModule {}
