import { parseCsv, type CsvRow } from './csv';
import { parseMoney } from './money';
import type { ContractRecord, Dataset, PaymentRecord, WorkRecord, WorkStatus } from './report.types';

const CONTRACT_COLUMNS = ['contract_id', 'contractor', 'amount', 'signed_at'];
const WORK_COLUMNS = ['work_id', 'contract_id', 'title', 'price', 'status', 'completed_at', 'cancelled_at'];
const PAYMENT_COLUMNS = [
  'payment_id', 'contract_id', 'work_id', 'purpose', 'amount', 'status', 'created_at', 'paid_at', 'refunded_at',
];

export function validateDate(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}: ожидается дата YYYY-MM-DD`);
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${label}: несуществующая календарная дата`);
  }
  return value;
}

function required(row: CsvRow, key: string, source: string, rowNumber: number): string {
  const value = row[key];
  if (value === undefined || value === '') throw new Error(`${source}: строка ${rowNumber}: поле ${key} обязательно`);
  return value;
}

function optionalDate(row: CsvRow, key: string, source: string, rowNumber: number): string | null {
  const value = row[key];
  if (value === undefined || value === '') return null;
  return validateDate(value, `${source}, строка ${rowNumber}, ${key}`);
}

function assertUnique(ids: string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${label}: повторяется идентификатор ${id}`);
    seen.add(id);
  }
}

function toStatus(value: string, rowNumber: number): WorkStatus {
  if (value === 'planned' || value === 'done' || value === 'cancelled') return value;
  throw new Error(`works.csv: строка ${rowNumber}: неизвестный статус ${value}`);
}

export function parseDataset(
  contractsContent: string,
  worksContent: string,
  paymentsContent: string,
): Dataset {
  const contractRows = parseCsv(contractsContent, 'contracts.csv', CONTRACT_COLUMNS);
  const workRows = parseCsv(worksContent, 'works.csv', WORK_COLUMNS);
  const paymentRows = parseCsv(paymentsContent, 'payments.csv', PAYMENT_COLUMNS);

  const contracts: ContractRecord[] = contractRows.map((row, index) => {
    const rowNumber = index + 2;
    return {
      contractId: required(row, 'contract_id', 'contracts.csv', rowNumber),
      contractor: required(row, 'contractor', 'contracts.csv', rowNumber),
      amountCents: parseMoney(required(row, 'amount', 'contracts.csv', rowNumber), `contracts.csv, строка ${rowNumber}, amount`),
      signedAt: validateDate(required(row, 'signed_at', 'contracts.csv', rowNumber), `contracts.csv, строка ${rowNumber}, signed_at`),
    };
  });
  assertUnique(contracts.map((contract) => contract.contractId), 'contracts.csv');
  const contractIds = new Set(contracts.map((contract) => contract.contractId));

  const works: WorkRecord[] = workRows.map((row, index) => {
    const rowNumber = index + 2;
    const work: WorkRecord = {
      workId: required(row, 'work_id', 'works.csv', rowNumber),
      contractId: required(row, 'contract_id', 'works.csv', rowNumber),
      title: required(row, 'title', 'works.csv', rowNumber),
      priceCents: parseMoney(required(row, 'price', 'works.csv', rowNumber), `works.csv, строка ${rowNumber}, price`),
      sourceStatus: toStatus(required(row, 'status', 'works.csv', rowNumber), rowNumber),
      completedAt: optionalDate(row, 'completed_at', 'works.csv', rowNumber),
      cancelledAt: optionalDate(row, 'cancelled_at', 'works.csv', rowNumber),
    };

    if (!contractIds.has(work.contractId)) {
      throw new Error(`works.csv: строка ${rowNumber}: договор ${work.contractId} не найден`);
    }
    if (work.sourceStatus === 'done' && (!work.completedAt || work.cancelledAt)) {
      throw new Error(`works.csv: строка ${rowNumber}: для done нужна только completed_at`);
    }
    if (work.sourceStatus === 'cancelled' && (!work.cancelledAt || work.completedAt)) {
      throw new Error(`works.csv: строка ${rowNumber}: для cancelled нужна только cancelled_at`);
    }
    if (work.sourceStatus === 'planned' && (work.completedAt || work.cancelledAt)) {
      throw new Error(`works.csv: строка ${rowNumber}: planned не должна иметь completed_at или cancelled_at`);
    }
    return work;
  });
  assertUnique(works.map((work) => work.workId), 'works.csv');
  const workById = new Map(works.map((work) => [work.workId, work]));

  const payments: PaymentRecord[] = paymentRows.map((row, index) => {
    const rowNumber = index + 2;
    const paymentId = required(row, 'payment_id', 'payments.csv', rowNumber);
    const contractId = required(row, 'contract_id', 'payments.csv', rowNumber);
    const workIdValue = row.work_id ?? '';
    const workId = workIdValue === '' ? null : workIdValue;
    const status = required(row, 'status', 'payments.csv', rowNumber);
    if (status !== 'paid' && status !== 'queued' && status !== 'refunded') {
      throw new Error(`payments.csv: строка ${rowNumber}: неизвестный статус ${status}`);
    }
    if (!contractIds.has(contractId)) {
      throw new Error(`payments.csv: строка ${rowNumber}: договор ${contractId} не найден`);
    }

    const payment: PaymentRecord = {
      paymentId,
      contractId,
      workId,
      purpose: row.purpose ?? '',
      amountCents: parseMoney(required(row, 'amount', 'payments.csv', rowNumber), `payments.csv, строка ${rowNumber}, amount`),
      status,
      createdAt: validateDate(required(row, 'created_at', 'payments.csv', rowNumber), `payments.csv, строка ${rowNumber}, created_at`),
      paidAt: optionalDate(row, 'paid_at', 'payments.csv', rowNumber),
      refundedAt: optionalDate(row, 'refunded_at', 'payments.csv', rowNumber),
    };

    if (status === 'queued' && (payment.paidAt || payment.refundedAt)) {
      throw new Error(`payments.csv: строка ${rowNumber}: queued не должна иметь paid_at или refunded_at`);
    }
    if (status === 'paid' && (!payment.paidAt || payment.refundedAt)) {
      throw new Error(`payments.csv: строка ${rowNumber}: для paid нужна только paid_at`);
    }
    if (status === 'refunded' && (!payment.paidAt || !payment.refundedAt)) {
      throw new Error(`payments.csv: строка ${rowNumber}: для refunded нужны paid_at и refunded_at`);
    }
    if (payment.paidAt && payment.refundedAt && payment.refundedAt < payment.paidAt) {
      throw new Error(`payments.csv: строка ${rowNumber}: refunded_at не может быть раньше paid_at`);
    }
    if (workId) {
      const work = workById.get(workId);
      if (!work) throw new Error(`payments.csv: строка ${rowNumber}: работа ${workId} не найдена`);
      if (work.contractId !== contractId) {
        throw new Error(`payments.csv: строка ${rowNumber}: работа ${workId} относится к другому договору`);
      }
    }
    return payment;
  });
  assertUnique(payments.map((payment) => payment.paymentId), 'payments.csv');

  return { contracts, works, payments };
}
