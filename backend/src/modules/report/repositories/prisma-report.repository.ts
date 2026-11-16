import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import type { Dataset, WorkStatus, PaymentRecord } from '../../../common/domain/accounting.types';
import { ReportRepository } from './report.repository';

const dateString = (value: Date): string => value.toISOString().slice(0, 10);
const optionalDate = (value: Date | null): string | null => value ? dateString(value) : null;

@Injectable()
export class PrismaReportRepository extends ReportRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  getDataset(): Promise<Dataset> {
    return this.prisma.client.$transaction(async (transaction) => {
      const [contracts, works, payments] = await Promise.all([
        transaction.contract.findMany({ orderBy: { id: 'asc' } }),
        transaction.work.findMany({ orderBy: { id: 'asc' } }),
        transaction.payment.findMany({ orderBy: { id: 'asc' } }),
      ]);
      return {
        contracts: contracts.map((row) => ({ contractId: row.id, contractor: row.contractor,
          amountCents: row.amountCents, signedAt: dateString(row.signedAt) })),
        works: works.map((row) => ({ workId: row.id, contractId: row.contractId, title: row.title,
          priceCents: row.priceCents, sourceStatus: row.status as WorkStatus,
          completedAt: optionalDate(row.completedAt), cancelledAt: optionalDate(row.cancelledAt) })),
        payments: payments.map((row) => ({ paymentId: row.id, contractId: row.contractId,
          workId: row.workId, purpose: row.purpose, amountCents: row.amountCents,
          status: row.status as PaymentRecord['status'], createdAt: dateString(row.createdAt),
          paidAt: optionalDate(row.paidAt), refundedAt: optionalDate(row.refundedAt) })),
      };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
