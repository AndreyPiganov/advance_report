import { ApiProperty } from '@nestjs/swagger';
import type { ImportResult } from '../domain/import-result';

export class ImportCountsDto {
  @ApiProperty({ example: 2, minimum: 0 }) contracts!: number;
  @ApiProperty({ example: 9, minimum: 0 }) works!: number;
  @ApiProperty({ example: 8, minimum: 0 }) payments!: number;
}

export class ImportResultDto implements ImportResult {
  @ApiProperty({ type: () => ImportCountsDto }) processed!: ImportCountsDto;
}
