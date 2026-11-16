import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AppConfig } from '../../../config/app.config';
import { CsvImportService } from '../services/csv-import.service';

@Injectable()
export class CsvImportScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(CsvImportScheduler.name);

  constructor(private readonly config: AppConfig, private readonly imports: CsvImportService,
    private readonly registry: SchedulerRegistry) {}

  async onApplicationBootstrap(): Promise<void> {
    // Validate cron settings before importing the initial data.
    const job = CronJob.from({
      cronTime: this.config.importCron,
      timeZone: this.config.importTimeZone,
      waitForCompletion: true,
      onTick: () => this.runScheduled(),
    });
    const result = await this.imports.initialize();
    if (result) this.logger.log(`Первоначальный импорт CSV: ${JSON.stringify(result.processed)}`);
    this.registry.addCronJob('csv-import', job);
    job.start();
  }

  async runScheduled(): Promise<void> {
    try {
      const result = await this.imports.importFromFiles();
      if (result) this.logger.log(`Импорт CSV по расписанию: ${JSON.stringify(result.processed)}`);
    } catch (error) {
      this.logger.error(`Импорт CSV по расписанию не выполнен: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
