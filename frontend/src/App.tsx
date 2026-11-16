import { useEffect, useState, type FormEvent } from 'react';
import { formatDate, formatRubles, statusLabels, type ContractReport, type ReportResponse } from './report';

const DEFAULT_DATE = '2026-11-10';

function initialDate(): string {
  const requested = new URLSearchParams(window.location.search).get('date');
  return requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : DEFAULT_DATE;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Не удалось загрузить отчёт.';
}

function contractCountLabel(count: number): string {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} договоров`;
  const last = count % 10;
  if (last === 1) return `${count} договор`;
  if (last >= 2 && last <= 4) return `${count} договора`;
  return `${count} договоров`;
}

async function ensureOk(response: Response): Promise<void> {
  if (!response.ok) {
    let message = `Ошибка сервера: ${response.status}`;
    try {
      const body: { message?: string | string[] } = await response.json();
      if (body.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
    } catch {
      // Keep the HTTP status if the response is not JSON.
    }
    throw new Error(message);
  }
}

async function fetchReport(date: string, signal: AbortSignal): Promise<ReportResponse> {
  const response = await fetch(`/api/report?date=${encodeURIComponent(date)}`, { signal });
  await ensureOk(response);
  return (await response.json()) as ReportResponse;
}

function ContractCard({ contract }: { contract: ContractReport }) {
  const hasDifference = contract.remaining !== contract.worksRemainingTotal;
  return (
    <section className="contract-card" aria-labelledby={`contract-${contract.contractId}`}>
      <div className="contract-heading">
        <div>
          <span className="eyebrow">Договор {contract.contractId}</span>
          <h2 id={`contract-${contract.contractId}`}>{contract.contractor}</h2>
        </div>
        <span className="work-count">Работ: {contract.works.length}</span>
      </div>

      <div className="summary-grid">
        <div className="summary-item">
          <span>Сумма договора</span>
          <strong>{formatRubles(contract.contractAmount)}</strong>
        </div>
        <div className="summary-item">
          <span>Выплачено</span>
          <strong>{formatRubles(contract.paid)}</strong>
        </div>
        <div className="summary-item summary-item-accent">
          <span>Осталось по договору</span>
          <strong>{formatRubles(contract.remaining)}</strong>
        </div>
      </div>

      <div className={`work-total${hasDifference ? ' work-total-difference' : ''}`}>
        <span>Сумма остатков по работам</span>
        <strong>{formatRubles(contract.worksRemainingTotal)}</strong>
        {hasDifference && <small>Может отличаться от остатка договора из-за отменённых работ или разницы исходных сумм.</small>}
      </div>

      {contract.unallocatedPaid !== '0.00' && (
        <p className="notice">Без распределения по работам: {formatRubles(contract.unallocatedPaid)}</p>
      )}

      <div className="table-scroll">
        <table>
          <caption>Работы по договору {contract.contractId}</caption>
          <thead>
            <tr>
              <th scope="col">Работа</th>
              <th scope="col">Статус</th>
              <th scope="col" className="number">Цена</th>
              <th scope="col" className="number">Выплачено</th>
              <th scope="col" className="number">Осталось</th>
            </tr>
          </thead>
          <tbody>
            {contract.works.map((work) => (
              <tr key={work.workId}>
                <td>
                  <span className="work-title">{work.title}</span>
                  <span className="work-id">{work.workId}</span>
                </td>
                <td><span className={`status status-${work.status}`}>{statusLabels[work.status]}</span></td>
                <td className="number">{formatRubles(work.price)}</td>
                <td className="number">{formatRubles(work.paid)}</td>
                <td className="number number-strong">{formatRubles(work.remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function App() {
  const [date, setDate] = useState(initialDate);
  const [requestedDate, setRequestedDate] = useState(initialDate);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchReport(requestedDate, controller.signal)
      .then(setReport)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [requestedDate, requestVersion]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) return;
    window.history.replaceState(null, '', `?date=${encodeURIComponent(date)}`);
    setRequestedDate(date);
    setRequestVersion((version) => version + 1);
  }

  async function refreshData() {
    if (refreshing || loading) return;
    setRefreshing(true);
    setRefreshError(null);
    setRefreshSuccess(false);
    try {
      const response = await fetch('/api/imports/csv/refresh', { method: 'POST' });
      await ensureOk(response);
      await response.json();
      const updated = await fetchReport(requestedDate, new AbortController().signal);
      setReport(updated);
      setError(null);
      setRefreshSuccess(true);
    } catch (reason) {
      setRefreshError(errorMessage(reason));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div className="header-copy">
          <span className="eyebrow">Финансы / Подрядчики</span>
          <h1>Отчёт по договорам</h1>
          <p>Выплаты и остатки по каждой работе на выбранную дату.</p>
        </div>
        <form className="date-form" onSubmit={submit}>
          <label htmlFor="report-date">Отчёт на дату</label>
          <div className="date-controls">
            <input id="report-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required disabled={refreshing} />
            <button type="submit" disabled={loading || refreshing}>Показать</button>
          </div>
          <button className="refresh-button" type="button" onClick={() => void refreshData()}
            disabled={loading || refreshing} aria-busy={refreshing}>
            {refreshing ? 'Обновляем данные…' : 'Обновить данные'}
          </button>
        </form>
      </header>

      {refreshError && <div className="state-panel state-error" role="alert">Не удалось обновить данные: {refreshError}</div>}
      {refreshSuccess && <div className="refresh-success" role="status">Данные обновлены. Отчёт актуален на выбранную дату.</div>}
      {loading && <div className="state-panel" role="status">Загружаем отчёт…</div>}
      {error && !loading && <div className="state-panel state-error" role="alert">{error}</div>}
      {!loading && !error && report && (
        <>
          <div className="report-intro">
            <div>
              <span className="eyebrow">Срез данных</span>
              <h2>На {formatDate(report.asOfDate)}</h2>
            </div>
            <p>{contractCountLabel(report.contracts.length)} в отчёте</p>
          </div>
          {report.contracts.length === 0 ? (
            <div className="state-panel">На эту дату договоров в данных нет.</div>
          ) : (
            <div className="contracts-list">
              {report.contracts.map((contract) => <ContractCard key={contract.contractId} contract={contract} />)}
            </div>
          )}
          <p className="report-note">Остаток показывает неоплаченную часть цены. Для запланированных работ это не означает просрочку платежа.</p>
        </>
      )}
    </main>
  );
}
