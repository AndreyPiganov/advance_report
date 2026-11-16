import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { AppConfigModule } from '../../config/app-config.module';
import { ImportController } from './controllers/import.controller';
import { ImportRepository } from './repositories/import.repository';
import { PrismaImportRepository } from './repositories/prisma-import.repository';
import { CsvImportService } from './services/csv-import.service';
import { CsvImportScheduler } from './scheduling/csv-import.scheduler';

@Module({
  imports: [PrismaModule, AppConfigModule],
  controllers: [ImportController],
  providers: [CsvImportService, CsvImportScheduler,
    { provide: ImportRepository, useClass: PrismaImportRepository }],
})
export class ImportModule {}
