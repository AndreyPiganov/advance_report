import { ValidateBy, type ValidationOptions } from 'class-validator';
import { validateDate } from '../utils/date';
import { parseMoney } from '../utils/money';

export function IsAccountingDate(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy({ name: 'isAccountingDate', validator: {
    validate(value: unknown): boolean {
      if (typeof value !== 'string') return false;
      try { validateDate(value, 'date'); return true; } catch { return false; }
    },
    defaultMessage: () => 'ожидается дата YYYY-MM-DD; несуществующая календарная дата недопустима',
  } }, options);
}

export function IsMoneyAmount(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy({ name: 'isMoneyAmount', validator: {
    validate(value: unknown): boolean {
      if (typeof value !== 'string') return false;
      try { return parseMoney(value, 'amount') <= 9223372036854775807n; } catch { return false; }
    },
    defaultMessage: () => 'ожидается неотрицательная сумма с точностью до копеек в диапазоне PostgreSQL bigint',
  } }, options);
}
