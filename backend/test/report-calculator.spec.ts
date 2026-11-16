import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { parseDataset } from '../src/modules/imports/parsers/csv/dataset.mapper';
import { calculateReport } from '../src/modules/report/domain/report-calculator';
import { parseMoney, formatMoney } from '../src/common/utils/money';

const dataPath = (name: string) => join(process.cwd(), 'data', name);

async function sourceDataset() {
  const [contracts, works, payments] = await Promise.all([
    readFile(dataPath('contracts.csv'), 'utf8'),
    readFile(dataPath('works.csv'), 'utf8'),
    readFile(dataPath('payments.csv'), 'utf8'),
  ]);
  return parseDataset(contracts, works, payments);
}

test('parses money to integer kopecks and formats it without floating point', () => {
  assert.equal(parseMoney('123.45', 'amount'), 12345n);
  assert.equal(formatMoney(12345n), '123.45');
  assert.throws(() => parseMoney('1.999', 'amount'));
});

test('builds the report for 2026-11-10 with exact contract and work totals', async () => {
  const report = calculateReport(await sourceDataset(), '2026-11-10');
  const d1 = report.contracts.find((contract) => contract.contractId === 'D-1');
  const d2 = report.contracts.find((contract) => contract.contractId === 'D-2');

  assert.ok(d1);
  assert.equal(d1.paid, '315000.00');
  assert.equal(d1.remaining, '285000.00');
  assert.equal(d1.worksRemainingTotal, '185000.00');
  assert.deepEqual(
    d1.works.map(({ workId, paid, remaining }) => [workId, paid, remaining]),
    [
      ['W-11', '60000.00', '40000.00'],
      ['W-12', '60000.00', '40000.00'],
      ['W-13', '0.00', '0.00'],
      ['W-14', '75000.00', '25000.00'],
      ['W-15', '60000.00', '40000.00'],
      ['W-16', '60000.00', '40000.00'],
    ],
  );

  assert.ok(d2);
  assert.equal(d2.paid, '75000.00');
  assert.equal(d2.remaining, '15000.00');
  assert.equal(d2.worksRemainingTotal, '15000.00');
  assert.equal(d2.works.find((work) => work.workId === 'W-23')?.status, 'planned');
  assert.equal(d2.works.find((work) => work.workId === 'W-23')?.paid, '33333.33');
});

test('includes a refund through its refund date and excludes it on the following day', async () => {
  const dataset = await sourceDataset();
  const beforeRefund = calculateReport(dataset, '2026-09-09').contracts.find((contract) => contract.contractId === 'D-1');
  const onRefundDate = calculateReport(dataset, '2026-09-10').contracts.find((contract) => contract.contractId === 'D-1');
  const afterRefund = calculateReport(dataset, '2026-09-11').contracts.find((contract) => contract.contractId === 'D-1');
  assert.equal(beforeRefund?.paid, '350000.00');
  assert.equal(onRefundDate?.paid, '350000.00');
  assert.equal(afterRefund?.paid, '300000.00');
});

test('distributes odd kopecks by largest remainder and work ID tie-break', () => {
  const dataset = parseDataset(
    'contract_id,contractor,amount,signed_at\nC-1,Test,0.01,2026-01-01\n',
    'work_id,contract_id,title,price,status,completed_at,cancelled_at\nW-2,C-1,Second,1.00,planned,,\nW-1,C-1,First,1.00,planned,,\n',
    'payment_id,contract_id,work_id,purpose,amount,status,created_at,paid_at,refunded_at\nP-1,C-1,,Advance,0.01,paid,2026-01-01,2026-01-01,\n',
  );
  const report = calculateReport(dataset, '2026-01-01');
  assert.deepEqual(report.contracts[0]!.works.map((work) => [work.workId, work.paid]), [
    ['W-2', '0.00'],
    ['W-1', '0.01'],
  ]);
});

test('rejects broken cross-references and invalid report dates', () => {
  assert.throws(() => calculateReport({ contracts: [], works: [], payments: [] }, '2026-02-30'));
  assert.throws(() =>
    parseDataset(
      'contract_id,contractor,amount,signed_at\nC-1,Test,1.00,2026-01-01\n',
      'work_id,contract_id,title,price,status,completed_at,cancelled_at\nW-1,UNKNOWN,Work,1.00,planned,,\n',
      'payment_id,contract_id,work_id,purpose,amount,status,created_at,paid_at,refunded_at\n',
    ),
  );
});
