import { Controller, Get, Query } from '@nestjs/common';
import { ReportService } from '../services/report.service';
import { ReportQueryDto } from '../dto/report-query.dto';
import { ReportResponseDto } from '../dto/report-response.dto';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorDto } from '../../../common/dto/api-error.dto';

@Controller('report')
@ApiTags('Отчёт')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  @ApiOperation({ summary: 'Отчёт по договорам и работам на дату' })
  @ApiOkResponse({ type: ReportResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorDto, description: 'Некорректная дата или неизвестный query-параметр' })
  getReport(@Query() query: ReportQueryDto): Promise<ReportResponseDto> {
    return this.reportService.getReport(query.date);
  }
}
