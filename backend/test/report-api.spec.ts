import 'reflect-metadata';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { NestFactory } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/database/prisma.service';
import { withTestDatabase } from './helpers/test-database';
import { AppModule } from '../src/app.module';
import { AppConfig } from '../src/config/app.config';
import type { ReportResponseDto } from '../src/modules/report/dto/report-response.dto';
import { configureApp } from '../src/config/configure-app';

async function createApp(databaseUrl: string, directory: string): Promise<INestApplication> {
  const previous = { DATABASE_URL: process.env.DATABASE_URL, DATA_DIR: process.env.DATA_DIR,
    IMPORT_CRON: process.env.IMPORT_CRON, IMPORT_TIME_ZONE: process.env.IMPORT_TIME_ZONE };
  Object.assign(process.env, { DATABASE_URL: databaseUrl, DATA_DIR: directory,
    IMPORT_CRON: '0 * * * *', IMPORT_TIME_ZONE: 'Europe/Moscow' });
  try {
    const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
    configureApp(app);
    return app;
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('PostgreSQL reports, initial and scheduled CSV import, manual refresh and Swagger',
  { skip: !process.env.TEST_DATABASE_URL }, async () => withTestDatabase(async (databaseUrl) => {
  const directory = await mkdtemp(join(tmpdir(), 'advance-report-test-'));
  for (const name of ['contracts.csv', 'works.csv', 'payments.csv']) {
    await copyFile(resolve('data', name), join(directory, name));
  }
  let app = await createApp(databaseUrl, directory);
  try {
    await app.listen(0, '127.0.0.1');
    const address = await app.getUrl();
    const response = await fetch(`${address}/api/report?date=2026-11-10`);
    assert.equal(response.status, 200);
    const report = await response.json() as ReportResponseDto;
    assert.equal(report.asOfDate, '2026-11-10');
    assert.equal(report.contracts[0]?.paid, '315000.00');
    assert.equal(report.contracts[0]?.worksRemainingTotal, '185000.00');
    assert.equal(report.contracts[1]?.paid, '75000.00');

    for (const query of ['', '?date=wrong', '?date=2026-02-30', '?date=0000-01-01',
      '?date=2026-11-10&date=2026-11-11', '?date=2026-11-10&unknown=value']) {
      const invalid = await fetch(`${address}/api/report${query}`);
      assert.equal(invalid.status, 400, query);
    }
    const health = await fetch(`${address}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    assert.equal((await fetch(`${address}/api/missing`)).status, 404);
    assert.equal((await fetch(`${address}/api/docs`)).status, 200);
    const specification = await (await fetch(`${address}/api/docs-json`)).json() as {
      paths: Record<string, { get?: { parameters: { name: string }[] }; post?: unknown }>;
      components: { schemas: Record<string, { properties: Record<string, unknown> }> };
    };
    assert.ok(specification.paths['/api/report']?.get?.parameters.some((parameter) => parameter.name === 'date'));
    assert.equal(specification.paths['/api/imports/excel'], undefined);
    assert.equal(specification.paths['/api/imports/template'], undefined);
    assert.equal((await fetch(`${address}/api/imports/excel`, { method: 'POST' })).status, 404);
    assert.equal((await fetch(`${address}/api/imports/template`)).status, 404);
    assert.ok(specification.components.schemas.ReportResponseDto?.properties.contracts);
    assert.ok(specification.components.schemas.WorkResponseDto?.properties.paid);
    assert.ok(specification.paths['/api/imports/csv/refresh']?.post);
    const registry = app.get(SchedulerRegistry);
    assert.equal(registry.getCronJob('csv-import').cronTime.source, '0 * * * *');
    assert.ok(await app.get(PrismaService).client.importState.findUnique({ where: { id: 'csv' } }));

    const paymentsPath = join(directory, 'payments.csv');
    const original = await readFile(paymentsPath, 'utf8');
    await writeFile(paymentsPath, original.replace('15000.00', '15000.01'));
    await app.close();
    app = await createApp(databaseUrl, directory);
    await app.listen(0, '127.0.0.1');
    const restarted = await app.getUrl();
    const reportAtDate = async () => (await (await fetch(`${restarted}/api/report?date=2026-11-10`)).json()) as ReportResponseDto;
    const refresh = () => fetch(`${restarted}/api/imports/csv/refresh`, { method: 'POST' });
    // Startup marker keeps a restart from reimporting changed source files.
    assert.equal((await reportAtDate()).contracts[0]?.paid, '315000.00');
    const refreshed = await refresh();
    assert.equal(refreshed.status, 200);
    assert.deepEqual(await refreshed.json(), { processed: { contracts: 2, works: 9, payments: 8 } });
    assert.equal((await reportAtDate()).contracts[0]?.paid, '315000.01');
    assert.equal((await refresh()).status, 200);
    assert.equal(await app.get(PrismaService).client.payment.count(), 8);

    await writeFile(paymentsPath, original.replace('15000.00', '15000.02'));
    await app.get(SchedulerRegistry).getCronJob('csv-import').fireOnTick();
    assert.equal((await reportAtDate()).contracts[0]?.paid, '315000.02');
    const importedAt = (await app.get(PrismaService).client.importState.findUniqueOrThrow({ where: { id: 'csv' } })).lastImportedAt;

    await writeFile(paymentsPath, original.replace('15000.00', '15000.999'));
    assert.equal((await refresh()).status, 400);
    await app.get(SchedulerRegistry).getCronJob('csv-import').fireOnTick();
    assert.equal((await reportAtDate()).contracts[0]?.paid, '315000.02');
    assert.deepEqual((await app.get(PrismaService).client.importState.findUniqueOrThrow({ where: { id: 'csv' } })).lastImportedAt, importedAt);

    await writeFile(paymentsPath, original.replace('15000.00', '15000.03'));
    await app.get(SchedulerRegistry).getCronJob('csv-import').fireOnTick();
    assert.equal((await reportAtDate()).contracts[0]?.paid, '315000.03');
    await unlink(join(directory, 'contracts.csv'));
    assert.equal((await refresh()).status, 503);
    assert.equal((await reportAtDate()).contracts[0]?.paid, '315000.03');
    await app.close();
    app = await createApp(databaseUrl, directory);
    await app.listen(0, '127.0.0.1');
    const responseAfterMissingFile = await fetch(`${await app.getUrl()}/api/report?date=2026-11-10`);
    assert.equal(responseAfterMissingFile.status, 200);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
}));

test('DATABASE_URL is required and must be a PostgreSQL URL', () => {
  const original = process.env.DATABASE_URL;
  try {
    delete process.env.DATABASE_URL;
    assert.throws(() => new AppConfig(), /DATABASE_URL обязателен/);
    process.env.DATABASE_URL = 'https://example.com';
    assert.throws(() => new AppConfig(), /строка подключения PostgreSQL/);
  } finally {
    if (original === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original;
  }
});
