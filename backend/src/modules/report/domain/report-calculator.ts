import { formatMoney, remainingMoney, sumMoney } from '../../../common/utils/money';
import { validateDate } from '../../../common/utils/date';
import type { ContractRecord, Dataset, PaymentRecord, WorkRecord, WorkStatus, Report } from './report.types';

function statusAt(work: WorkRecord, asOfDate: string): WorkStatus {
  if (work.cancelledAt && work.cancelledAt <= asOfDate) return 'cancelled';
  if (work.completedAt && work.completedAt <= asOfDate) return 'done';
  return 'planned';
}

function paidAtDate(payment: PaymentRecord, asOfDate: string): bigint {
  if (payment.status === 'queued' || !payment.paidAt || payment.paidAt > asOfDate) return 0n;
  if (payment.status === 'refunded' && payment.refundedAt && payment.refundedAt < asOfDate) return 0n;
  return payment.amountCents;
}

function distributeProportionally(
  totalCents: bigint,
  works: WorkRecord[],
): Map<string, bigint> | null {
  const eligible = works.filter((work) => work.priceCents > 0n);
  const weightTotal = sumMoney(eligible.map((work) => work.priceCents));
  if (weightTotal === 0n) return null;

  const shares = eligible.map((work) => {
    const numerator = totalCents * work.priceCents;
    return {
      workId: work.workId,
      cents: numerator / weightTotal,
      remainder: numerator % weightTotal,
    };
  });

  let centsLeft = totalCents - sumMoney(shares.map((share) => share.cents));
  const remainderOrder = [...shares].sort((left, right) => {
    if (left.remainder !== right.remainder) return left.remainder > right.remainder ? -1 : 1;
    return left.workId.localeCompare(right.workId);
  });
  for (const share of remainderOrder) {
    if (centsLeft === 0n) break;
    share.cents += 1n;
    centsLeft -= 1n;
  }

  return new Map(shares.map((share) => [share.workId, share.cents]));
}

function reportContract(
  contract: ContractRecord,
  dataset: Dataset,
  asOfDate: string,
): Report['contracts'][number] {
  const works = dataset.works.filter((work) => work.contractId === contract.contractId);
  const payments = dataset.payments.filter((payment) => payment.contractId === contract.contractId);
  const netPayments = payments.map((payment) => ({ payment, cents: paidAtDate(payment, asOfDate) }));
  const contractPaid = sumMoney(netPayments.map((entry) => entry.cents));
  const workPaid = new Map(works.map((work) => [work.workId, 0n]));
  let contractOnlyPaid = 0n;

  for (const { payment, cents } of netPayments) {
    if (cents === 0n) continue;
    if (payment.workId) {
      workPaid.set(payment.workId, (workPaid.get(payment.workId) ?? 0n) + cents);
    } else {
      contractOnlyPaid += cents;
    }
  }

  const activeWorks = works.filter((work) => statusAt(work, asOfDate) !== 'cancelled');
  const allocation = distributeProportionally(contractOnlyPaid, activeWorks);
  let unallocatedPaid = 0n;
  if (!allocation) {
    unallocatedPaid = contractOnlyPaid;
  } else {
    for (const [workId, cents] of allocation) {
      workPaid.set(workId, (workPaid.get(workId) ?? 0n) + cents);
    }
  }

  const workReports = works.map((work) => {
    const status = statusAt(work, asOfDate);
    const paid = workPaid.get(work.workId) ?? 0n;
    const remaining = status === 'cancelled' ? 0n : remainingMoney(work.priceCents, paid);
    return {
      workId: work.workId,
      title: work.title,
      status,
      price: formatMoney(work.priceCents),
      paid: formatMoney(paid),
      remaining: formatMoney(remaining),
    };
  });

  const worksPriceTotal = sumMoney(works.map((work) => work.priceCents));
  const worksPaidTotal = sumMoney(workPaid.values());
  const worksRemainingTotal = sumMoney(workReports.map((work) => BigInt(work.remaining.replace('.', ''))));

  return {
    contractId: contract.contractId,
    contractor: contract.contractor,
    contractAmount: formatMoney(contract.amountCents),
    paid: formatMoney(contractPaid),
    remaining: formatMoney(remainingMoney(contract.amountCents, contractPaid)),
    worksPriceTotal: formatMoney(worksPriceTotal),
    worksPaidTotal: formatMoney(worksPaidTotal),
    worksRemainingTotal: formatMoney(worksRemainingTotal),
    unallocatedPaid: formatMoney(unallocatedPaid),
    works: workReports,
  };
}

export function calculateReport(dataset: Dataset, reportDate: string): Report {
  const asOfDate = validateDate(reportDate, 'date');
  const contracts = dataset.contracts
    .filter((contract) => contract.signedAt <= asOfDate)
    .map((contract) => reportContract(contract, dataset, asOfDate));
  return { asOfDate, contracts };
}
