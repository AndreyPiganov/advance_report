import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiOkResponse,
  ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { ImportResultDto } from '../dto/import-result.dto';
import { ApiErrorDto } from '../../../common/dto/api-error.dto';
import { CsvImportService } from '../services/csv-import.service';

@Controller('imports')
@ApiTags('Импорт данных')
export class ImportController {
  constructor(private readonly csvImports: CsvImportService) {}

  @Post('csv/refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Принудительно обновить данные из CSV',
    description: 'Читает contracts.csv, works.csv и payments.csv из DATA_DIR и сохраняет их в одной транзакции PostgreSQL.' })
  @ApiOkResponse({ type: ImportResultDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'Некорректные данные CSV' })
  @ApiConflictResponse({ type: ApiErrorDto, description: 'Конфликт связей с существующими данными' })
  @ApiServiceUnavailableResponse({ type: ApiErrorDto, description: 'CSV-файлы недоступны' })
  async refreshCsv(): Promise<ImportResultDto> {
    return (await this.csvImports.importFromFiles())!;
  }
}
