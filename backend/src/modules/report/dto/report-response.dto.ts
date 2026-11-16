import { ApiProperty } from '@nestjs/swagger';
import type { ContractReport, Report, WorkReport } from '../domain/report.types';
import type { WorkStatus } from '../../../common/domain/accounting.types';

const money = { type: String, example: '100000.00', pattern: '^\\d+\\.\\d{2}$' };

export class WorkResponseDto implements WorkReport {
  @ApiProperty({ example: 'W-11' }) workId!: string;
  @ApiProperty({ example: 'Съёмка: весенняя коллекция' }) title!: string;
  @ApiProperty({ enum: ['planned', 'done', 'cancelled'] }) status!: WorkStatus;
  @ApiProperty(money) price!: string;
  @ApiProperty(money) paid!: string;
  @ApiProperty(money) remaining!: string;
}

export class ContractResponseDto implements ContractReport {
  @ApiProperty({ example: 'D-1' }) contractId!: string;
  @ApiProperty({ example: 'Студия «Свет»' }) contractor!: string;
  @ApiProperty(money) contractAmount!: string;
  @ApiProperty(money) paid!: string;
  @ApiProperty(money) remaining!: string;
  @ApiProperty(money) worksPriceTotal!: string;
  @ApiProperty(money) worksPaidTotal!: string;
  @ApiProperty(money) worksRemainingTotal!: string;
  @ApiProperty(money) unallocatedPaid!: string;
  @ApiProperty({ type: () => [WorkResponseDto] }) works!: WorkResponseDto[];
}

export class ReportResponseDto implements Report {
  @ApiProperty({ format: 'date', example: '2026-11-10' }) asOfDate!: string;
  @ApiProperty({ type: () => [ContractResponseDto] }) contracts!: ContractResponseDto[];
}
