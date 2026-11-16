import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { Pool } from 'pg';
import { parseDataset } from '../src/modules/imports/parsers/csv/dataset.mapper';
import { PrismaImportRepository } from '../src/modules/imports/repositories/prisma-import.repository';
import { PrismaReportRepository } from '../src/modules/report/repositories/prisma-report.repository';
import { PrismaService } from '../src/database/prisma.service';
import { deployMigrations } from '../src/database/migrate';
import type { AppConfig } from '../src/config/app.config';
import { calculateReport } from '../src/modules/report/domain/report-calculator';
import { fixtureCsv, fixtureDataset } from './helpers/dataset';

test('CSV reads quoted fields and exact reference amounts', async () => {
  const dataset = await fixtureDataset();
  assert.equal(dataset.contracts[0]?.signedAt, '2026-08-25');
  assert.equal(dataset.contracts[1]?.contractor, 'Иван Петров, дизайнер');
  assert.equal(dataset.contracts[1]?.amountCents, 9000000n);
  assert.equal(calculateReport(dataset, '2026-11-10').contracts[0]?.paid, '315000.00');
});

test('CSV rejects missing columns, duplicate IDs, broken references, invalid dates and excess precision', async () => {
  const [contracts, works, payments] = await fixtureCsv();
  assert.throws(() => parseDataset(contracts.replace('contract_id', 'missing'), works, payments), /отсутствуют колонки/);
  const duplicate = contracts.split(/\r?\n/)[1]!;
  assert.throws(() => parseDataset(`${contracts}\n${duplicate}\n`, works, payments), /повторяется идентификатор/);
  assert.throws(() => parseDataset(contracts, works, payments.replace('W-14', 'UNKNOWN')), /не найдена/);
  assert.throws(() => parseDataset(contracts.replace('600000.00', '12.345'), works, payments), /точностью до копеек/);
  assert.throws(() => parseDataset(contracts.replace('2026-08-25', '0000-01-01'), works, payments), /несуществующая календарная дата/);
});

test('CSV accepts a valid dataset containing only headers', async () => {
  const [contracts, works, payments] = await fixtureCsv();
  const header = (content: string) => `${content.split(/\r?\n/)[0]}\n`;
  assert.deepEqual(parseDataset(header(contracts), header(works), header(payments)), { contracts: [], works: [], payments: [] });
});

test('PostgreSQL repeat and concurrent imports are idempotent, updates persist and conflicts roll back',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    const admin = new Pool({ connectionString: url.toString() });
    const schema = `test_${randomUUID().replaceAll('-', '')}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    url.searchParams.set('schema', schema);
    const config: AppConfig = { port: 3000, dataDirectory: 'data', frontendDirectory: '', databaseUrl: url.toString(),
      importCron: '0 * * * *', importTimeZone: 'Europe/Moscow' };
    const database = new PrismaService(config);
    try {
      await deployMigrations(url.toString());
      await database.onModuleInit();
      const writer = new PrismaImportRepository(database);
      const reader = new PrismaReportRepository(database);
      const dataset = await fixtureDataset();
      const initialImports = await Promise.all([writer.saveCsv(dataset, true), writer.saveCsv(dataset, true)]);
      assert.equal(initialImports.filter((result) => result !== null).length, 1);
      assert.equal(await writer.saveCsv(dataset, true), null);
      await writer.saveCsv(dataset, false);
      await writer.saveCsv(dataset, false);
      await Promise.all([writer.saveCsv(dataset, false), writer.saveCsv(dataset, false)]);
      const stored = await reader.getDataset();
      assert.equal(stored.contracts.length, 2);
      assert.equal(stored.works.length, 9);
      assert.equal(stored.payments.length, 8);
      assert.deepEqual(calculateReport(stored, '2026-11-10'), calculateReport(dataset, '2026-11-10'));

      dataset.contracts[0]!.contractor = 'Updated contractor';
      dataset.payments.find((payment) => payment.paymentId === 'P-3')!.amountCents = 1500001n;
      await writer.saveCsv(dataset, false);
      assert.equal((await reader.getDataset()).payments.find((payment) => payment.paymentId === 'P-3')?.amountCents, 1500001n);
      const beforeFailure = await reader.getDataset();
      const stateBeforeFailure = await database.client.importState.findUniqueOrThrow({ where: { id: 'csv' } });
      // An omitted existing payment still references W-14; moving that work must roll back the other updates too.
      dataset.works.find((work) => work.workId === 'W-14')!.contractId = 'D-2';
      dataset.payments = dataset.payments.filter((payment) => payment.paymentId !== 'P-3');
      dataset.contracts[0]!.contractor = 'Must roll back';
      await assert.rejects(writer.saveCsv(dataset, false), /Импорт противоречит/);
      assert.deepEqual(await reader.getDataset(), beforeFailure);
      assert.deepEqual(await database.client.importState.findUniqueOrThrow({ where: { id: 'csv' } }), stateBeforeFailure);
    } finally {
      await database.onModuleDestroy();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  });

test('Prisma adopts the previous SQL migration without deleting existing accounting records',
  { skip: !process.env.TEST_DATABASE_URL }, async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    const admin = new Pool({ connectionString: url.toString() });
    const schema = `test_${randomUUID().replaceAll('-', '')}`;
    await admin.query(`CREATE SCHEMA ${schema}`);
    const legacyClient = await admin.connect();
    try {
      await legacyClient.query(`SET search_path TO ${schema}`);
      await legacyClient.query(await readFile(resolve('prisma/migrations/0001_accounting/migration.sql'), 'utf8'));
      await legacyClient.query("INSERT INTO app_migrations(version) VALUES ('001-accounting')");
      await legacyClient.query("INSERT INTO contracts(contract_id, contractor, amount_cents, signed_at) VALUES ('LEGACY', 'Existing', 12345, '2026-01-01')");
    } finally { legacyClient.release(); }
    url.searchParams.set('schema', schema);
    const database = new PrismaService({ port: 3000, dataDirectory: 'data', frontendDirectory: '', databaseUrl: url.toString(),
      importCron: '0 * * * *', importTimeZone: 'Europe/Moscow' });
    try {
      await deployMigrations(url.toString());
      await deployMigrations(url.toString());
      const stored = await new PrismaReportRepository(database).getDataset();
      assert.equal(stored.contracts[0]?.contractId, 'LEGACY');
      assert.equal(stored.contracts[0]?.amountCents, 12345n);
    } finally {
      await database.onModuleDestroy();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  });
