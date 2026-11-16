import 'reflect-metadata';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AppConfig } from '../src/config/app.config';
import { CsvReportRepository } from '../src/modules/report/repositories/csv-report.repository';
import type { ReportResponseDto } from '../src/modules/report/dto/report-response.dto';

test('modules load CSV and serve report, health and validation errors over HTTP', async () => {
  const app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
  app.setGlobalPrefix('api');
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

    for (const query of ['', '?date=wrong', '?date=2026-02-30', '?date=2026-11-10&date=2026-11-11']) {
      const invalid = await fetch(`${address}/api/report${query}`);
      assert.equal(invalid.status, 400, query);
    }
    const health = await fetch(`${address}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    assert.equal((await fetch(`${address}/api/missing`)).status, 404);
  } finally {
    await app.close();
  }
});

test('CSV repository fails startup when the configured data directory has no input files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'advance-report-test-'));
  const config: AppConfig = { port: 3000, dataDirectory: directory, frontendDirectory: '' };
  try {
    await assert.rejects(new CsvReportRepository(config).onModuleInit(), /Не удалось загрузить данные/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
