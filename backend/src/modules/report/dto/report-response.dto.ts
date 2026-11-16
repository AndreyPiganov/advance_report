import type { Report } from '../domain/report.types';

// Domain results already contain JSON-safe decimal strings; the HTTP API uses that shape directly.
export type ReportResponseDto = Report;
