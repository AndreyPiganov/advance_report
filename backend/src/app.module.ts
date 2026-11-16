import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { HealthModule } from './modules/health/health.module';
import { ReportModule } from './modules/report/report.module';

@Module({
  imports: [AppConfigModule, HealthModule, ReportModule],
})
export class AppModule {}
