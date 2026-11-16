import { ConflictException, Injectable } from '@nestjs/common';
import { isDeepStrictEqual } from 'node:util';
import { PrismaService } from '../../../database/prisma.service';
import { Prisma } from '../../../generated/prisma/client';
import type { Dataset } from '../../../common/domain/accounting.types';
import type { ImportResult } from '../domain/import-result';
import { ImportRepository } from './import.repository';

const dateValue = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
const optionalDate = (value: string | null): Date | null => value ? dateValue(value) : null;

@Injectable()
export class PrismaImportRepository extends ImportRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async hasCsvImport(): Promise<boolean> {
    return (await this.prisma.client.importState.findUnique({ where: { id: 'csv' } })) !== null;
  }

  async saveCsv(dataset: Dataset, onlyIfUninitialized: boolean): Promise<ImportResult | null> {
    const saved = await this.persist(dataset, onlyIfUninitialized);
    return saved ? this.result(dataset) : null;
  }

  private async persist(dataset: Dataset, onlyIfUninitialized: boolean): Promise<boolean> {
    try {
      return await this.prisma.client.$transaction(async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(2077854432)`;
        if (onlyIfUninitialized && await transaction.importState.findUnique({ where: { id: 'csv' } })) {
          return false;
        }
        const existingContracts = new Map((await transaction.contract.findMany({
          where: { id: { in: dataset.contracts.map((row) => row.contractId) } },
        })).map((row) => [row.id, row]));
        const existingWorks = new Map((await transaction.work.findMany({
          where: { id: { in: dataset.works.map((row) => row.workId) } },
        })).map((row) => [row.id, row]));
        const existingPayments = new Map((await transaction.payment.findMany({
          where: { id: { in: dataset.payments.map((row) => row.paymentId) } },
        })).map((row) => [row.id, row]));

        for (const row of dataset.contracts) {
          const data = { id: row.contractId, contractor: row.contractor,
            amountCents: row.amountCents, signedAt: dateValue(row.signedAt) };
          if (!isDeepStrictEqual(existingContracts.get(row.contractId), data)) {
            await transaction.contract.upsert({ where: { id: row.contractId }, create: data, update: data });
          }
        }
        for (const row of dataset.works) {
          const data = { id: row.workId, contractId: row.contractId, title: row.title,
            priceCents: row.priceCents, status: row.sourceStatus,
            completedAt: optionalDate(row.completedAt), cancelledAt: optionalDate(row.cancelledAt) };
          if (!isDeepStrictEqual(existingWorks.get(row.workId), data)) {
            await transaction.work.upsert({ where: { id: row.workId }, create: data, update: data });
          }
        }
        for (const row of dataset.payments) {
          const data = { id: row.paymentId, contractId: row.contractId, workId: row.workId,
            purpose: row.purpose, amountCents: row.amountCents, status: row.status,
            createdAt: dateValue(row.createdAt), paidAt: optionalDate(row.paidAt), refundedAt: optionalDate(row.refundedAt) };
          if (!isDeepStrictEqual(existingPayments.get(row.paymentId), data)) {
            await transaction.payment.upsert({ where: { id: row.paymentId }, create: data, update: data });
          }
        }
        const lastImportedAt = new Date();
        await transaction.importState.upsert({ where: { id: 'csv' },
          create: { id: 'csv', lastImportedAt }, update: { lastImportedAt } });
        return true;
      }, { maxWait: 60000, timeout: 60000 });
    } catch (error) {
      const cause = error instanceof Error ? error.cause : undefined;
      const sqlState = cause && typeof cause === 'object' && 'originalCode' in cause ? cause.originalCode : undefined;
      const constraintFailure = error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2003', 'P2004'].includes(error.code);
      // Deferred foreign keys can fail at COMMIT, where the adapter returns the original PostgreSQL error.
      if (constraintFailure || (typeof sqlState === 'string' && ['23503', '23505', '23514'].includes(sqlState))) {
        throw new ConflictException('Импорт противоречит существующим данным: проверьте ID и связи договоров, работ и платежей');
      }
      throw error;
    }
  }

  private result(dataset: Dataset): ImportResult {
    return { processed: { contracts: dataset.contracts.length, works: dataset.works.length, payments: dataset.payments.length } };
  }
}
