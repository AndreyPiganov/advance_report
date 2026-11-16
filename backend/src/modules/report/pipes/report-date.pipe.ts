import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { validateDate } from '../../../common/utils/date';

@Injectable()
export class ReportDatePipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !value) {
      throw new BadRequestException('Параметр date обязателен; формат: YYYY-MM-DD');
    }
    try {
      return validateDate(value, 'date');
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Некорректная дата отчёта');
    }
  }
}
