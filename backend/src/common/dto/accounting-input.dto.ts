import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { IsAccountingDate, IsMoneyAmount } from '../validation/accounting.rules';

export class ContractInputDto {
  @ApiProperty({ example: 'D-1' })
  @IsString() @IsNotEmpty()
  contract_id!: string;

  @ApiProperty({ example: 'Студия «Свет»' })
  @IsString() @IsNotEmpty()
  contractor!: string;

  @ApiProperty({ example: '600000.00', description: 'Рубли, максимум два знака после точки' })
  @IsMoneyAmount()
  amount!: string;

  @ApiProperty({ format: 'date', example: '2026-08-25' })
  @IsAccountingDate()
  signed_at!: string;
}

export class WorkInputDto {
  @ApiProperty({ example: 'W-11' })
  @IsString() @IsNotEmpty()
  work_id!: string;

  @ApiProperty({ example: 'D-1' })
  @IsString() @IsNotEmpty()
  contract_id!: string;

  @ApiProperty({ example: 'Съёмка: весенняя коллекция' })
  @IsString() @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: '100000.00' })
  @IsMoneyAmount()
  price!: string;

  @ApiProperty({ enum: ['planned', 'done', 'cancelled'] })
  @IsIn(['planned', 'done', 'cancelled'])
  status!: 'planned' | 'done' | 'cancelled';

  @ApiPropertyOptional({ example: '2026-09-20', description: 'Дата YYYY-MM-DD или пустая ячейка' })
  @ValidateIf((_row, value: unknown) => value !== '') @IsAccountingDate()
  completed_at!: string;

  @ApiPropertyOptional({ example: '', description: 'Дата YYYY-MM-DD или пустая ячейка' })
  @ValidateIf((_row, value: unknown) => value !== '') @IsAccountingDate()
  cancelled_at!: string;
}

export class PaymentInputDto {
  @ApiProperty({ example: 'P-1' })
  @IsString() @IsNotEmpty()
  payment_id!: string;

  @ApiProperty({ example: 'D-1' })
  @IsString() @IsNotEmpty()
  contract_id!: string;

  @ApiProperty({ example: '', description: 'ID работы или пустая ячейка' })
  @IsString()
  work_id!: string;

  @ApiProperty({ example: 'Аванс 50%' })
  @IsString()
  purpose!: string;

  @ApiProperty({ example: '300000.00' })
  @IsMoneyAmount()
  amount!: string;

  @ApiProperty({ enum: ['paid', 'queued', 'refunded'] })
  @IsIn(['paid', 'queued', 'refunded'])
  status!: 'paid' | 'queued' | 'refunded';

  @ApiProperty({ format: 'date', example: '2026-08-30' })
  @IsAccountingDate()
  created_at!: string;

  @ApiPropertyOptional({ example: '2026-09-01', description: 'Дата YYYY-MM-DD или пустая ячейка' })
  @ValidateIf((_row, value: unknown) => value !== '') @IsAccountingDate()
  paid_at!: string;

  @ApiPropertyOptional({ example: '', description: 'Дата YYYY-MM-DD или пустая ячейка' })
  @ValidateIf((_row, value: unknown) => value !== '') @IsAccountingDate()
  refunded_at!: string;
}
