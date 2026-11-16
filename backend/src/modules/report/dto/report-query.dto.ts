import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';
import { IsAccountingDate } from '../../../common/validation/accounting.rules';

export class ReportQueryDto {
  @ApiProperty({ format: 'date', example: '2026-11-10', description: 'Отчётная дата включительно' })
  @IsDefined() @IsString() @IsAccountingDate()
  date!: string;
}
