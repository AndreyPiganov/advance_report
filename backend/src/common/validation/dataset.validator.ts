import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ContractInputDto, WorkInputDto, PaymentInputDto } from '../dto/accounting-input.dto';
import { parseMoney } from '../utils/money';
import type { ContractRecord, Dataset, PaymentRecord, WorkRecord } from '../domain/accounting.types';

export type InputRow = Record<string, string>;

const CONTRACT_COLUMNS = ['contract_id', 'contractor', 'amount', 'signed_at'];
const WORK_COLUMNS = ['work_id', 'contract_id', 'title', 'price', 'status', 'completed_at', 'cancelled_at'];
const PAYMENT_COLUMNS = [
  'payment_id', 'contract_id', 'work_id', 'purpose', 'amount', 'status', 'created_at', 'paid_at', 'refunded_at',
];

export const DATA_COLUMNS = { contracts: CONTRACT_COLUMNS, works: WORK_COLUMNS, payments: PAYMENT_COLUMNS };

function validateRows<T extends object>(type: ClassConstructor<T>, rows: InputRow[], source: string): T[] {
  return rows.map((row, index) => {
    const instance = plainToInstance(type, row);
    const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: false,
      validationError: { target: false, value: false } });
    if (errors.length > 0) {
      const messages = errors.map((error) => `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`);
      throw new Error(`${source}: строка ${index + 2}: ${messages.join('; ')}`);
    }
    return instance;
  });
}

function assertUnique(ids: string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${label}: повторяется идентификатор ${id}`);
    seen.add(id);
  }
}

export function validateDatasetRows(
  contractRows: InputRow[], workRows: InputRow[], paymentRows: InputRow[],
): Dataset {
  const contracts: ContractRecord[] = validateRows(ContractInputDto, contractRows, 'contracts').map((row) => ({
    contractId: row.contract_id, contractor: row.contractor,
    amountCents: parseMoney(row.amount, 'amount'), signedAt: row.signed_at,
  }));
  assertUnique(contracts.map((contract) => contract.contractId), 'contracts');
  const contractIds = new Set(contracts.map((contract) => contract.contractId));

  const works: WorkRecord[] = validateRows(WorkInputDto, workRows, 'works').map((row, index) => {
    const rowNumber = index + 2;
    const work: WorkRecord = {
      workId: row.work_id, contractId: row.contract_id, title: row.title,
      priceCents: parseMoney(row.price, 'price'), sourceStatus: row.status,
      completedAt: row.completed_at || null, cancelledAt: row.cancelled_at || null,
    };
    if (!contractIds.has(work.contractId)) {
      throw new Error(`works: строка ${rowNumber}: договор ${work.contractId} не найден`);
    }
    if (work.sourceStatus === 'done' && (!work.completedAt || work.cancelledAt)) {
      throw new Error(`works: строка ${rowNumber}: для done нужна только completed_at`);
    }
    if (work.sourceStatus === 'cancelled' && (!work.cancelledAt || work.completedAt)) {
      throw new Error(`works: строка ${rowNumber}: для cancelled нужна только cancelled_at`);
    }
    if (work.sourceStatus === 'planned' && (work.completedAt || work.cancelledAt)) {
      throw new Error(`works: строка ${rowNumber}: planned не должна иметь completed_at или cancelled_at`);
    }
    return work;
  });
  assertUnique(works.map((work) => work.workId), 'works');
  const workById = new Map(works.map((work) => [work.workId, work]));

  const payments: PaymentRecord[] = validateRows(PaymentInputDto, paymentRows, 'payments').map((row, index) => {
    const rowNumber = index + 2;
    const payment: PaymentRecord = {
      paymentId: row.payment_id, contractId: row.contract_id, workId: row.work_id || null,
      purpose: row.purpose, amountCents: parseMoney(row.amount, 'amount'), status: row.status,
      createdAt: row.created_at, paidAt: row.paid_at || null, refundedAt: row.refunded_at || null,
    };
    if (!contractIds.has(payment.contractId)) {
      throw new Error(`payments: строка ${rowNumber}: договор ${payment.contractId} не найден`);
    }
    if (payment.status === 'queued' && (payment.paidAt || payment.refundedAt)) {
      throw new Error(`payments: строка ${rowNumber}: queued не должна иметь paid_at или refunded_at`);
    }
    if (payment.status === 'paid' && (!payment.paidAt || payment.refundedAt)) {
      throw new Error(`payments: строка ${rowNumber}: для paid нужна только paid_at`);
    }
    if (payment.status === 'refunded' && (!payment.paidAt || !payment.refundedAt)) {
      throw new Error(`payments: строка ${rowNumber}: для refunded нужны paid_at и refunded_at`);
    }
    if (payment.paidAt && payment.refundedAt && payment.refundedAt < payment.paidAt) {
      throw new Error(`payments: строка ${rowNumber}: refunded_at не может быть раньше paid_at`);
    }
    if (payment.workId) {
      const work = workById.get(payment.workId);
      if (!work) throw new Error(`payments: строка ${rowNumber}: работа ${payment.workId} не найдена`);
      if (work.contractId !== payment.contractId) {
        throw new Error(`payments: строка ${rowNumber}: работа ${payment.workId} относится к другому договору`);
      }
    }
    return payment;
  });
  assertUnique(payments.map((payment) => payment.paymentId), 'payments');
  return { contracts, works, payments };
}
