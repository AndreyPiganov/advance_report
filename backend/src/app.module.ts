import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { HealthModule } from './modules/health/health.module';
import { ReportModule } from './modules/report/report.module';
import { ImportModule } from './modules/imports/import.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot(), AppConfigModule, HealthModule, ReportModule, ImportModule],
})
export class AppModule {}
