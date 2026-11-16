export type WorkStatus = 'planned' | 'done' | 'cancelled';

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

export function formatRubles(value: string): string {
  const [rubles, kopecks] = value.split('.');
  return `${rubles.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')},${kopecks}\u00a0₽`;
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

export const statusLabels: Record<WorkStatus, string> = {
  planned: 'Запланирована',
  done: 'Принята',
  cancelled: 'Отменена',
};
