export type WorkStatus = 'planned' | 'done' | 'cancelled';

export interface ContractRecord {
  contractId: string;
  contractor: string;
  amountCents: bigint;
  signedAt: string;
}

export interface WorkRecord {
  workId: string;
  contractId: string;
  title: string;
  priceCents: bigint;
  sourceStatus: WorkStatus;
  completedAt: string | null;
  cancelledAt: string | null;
}

export interface PaymentRecord {
  paymentId: string;
  contractId: string;
  workId: string | null;
  purpose: string;
  amountCents: bigint;
  status: 'paid' | 'queued' | 'refunded';
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
}

export interface Dataset {
  contracts: ContractRecord[];
  works: WorkRecord[];
  payments: PaymentRecord[];
}

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

export interface ReportResponse {
  asOfDate: string;
  contracts: ContractReport[];
}
