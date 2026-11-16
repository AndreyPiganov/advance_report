import type { WorkStatus } from '../../../common/domain/accounting.types';
export type { ContractRecord, Dataset, PaymentRecord, WorkRecord, WorkStatus } from '../../../common/domain/accounting.types';

export interface WorkReport {
  workId: string;
  title: string;
  status: WorkStatus;
  price: string;
  paid: string;
  remaining: string;
}

export interface ContractReport {
  contractId: string;
  contractor: string;
  contractAmount: string;
  paid: string;
  remaining: string;
  worksPriceTotal: string;
  worksPaidTotal: string;
  worksRemainingTotal: string;
  unallocatedPaid: string;
  works: WorkReport[];
}

export interface Report {
  asOfDate: string;
  contracts: ContractReport[];
}
