/**
 * Usage Data Export Utilities
 *
 * Functions for exporting usage data in various formats.
 */

import type { UsageRecord } from '@/types/system/usage';
import type { TimeSeriesDataPoint } from './usage-analytics';

/**
 * Export usage records to CSV format
 */
export function exportRecordsToCSV(records: UsageRecord[]): string {
  const headers = [
    'id',
    'sessionId',
    'messageId',
    'provider',
    'model',
    'promptTokens',
    'completionTokens',
    'totalTokens',
    'cost',
    'latency',
    'status',
    'createdAt',
  ];

  const rows = records.map((r) =>
    [
      r.id,
      r.sessionId,
      r.messageId,
      r.provider,
      r.model,
      r.tokens.prompt,
      r.tokens.completion,
      r.tokens.total,
      r.cost.toFixed(6),
      r.latency ?? '',
      r.status ?? 'success',
      r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    ].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export usage records to JSON format
 */
export function exportRecordsToJSON(records: UsageRecord[]): string {
  return JSON.stringify(records, null, 2);
}

/**
 * Export time series data to CSV format
 */
export function exportTimeSeriesToCSV(data: TimeSeriesDataPoint[]): string {
  const headers = ['date', 'tokens', 'cost', 'requests'];

  const rows = data.map((point) =>
    [point.date, point.tokens, point.cost.toFixed(6), point.requests].join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export summary statistics to JSON format
 */
export function exportSummaryToJSON(summary: {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  timeRange: string;
  exportedAt: string;
}): string {
  return JSON.stringify(summary, null, 2);
}

/**
 * Download content as a file
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download usage records as CSV
 */
export function downloadRecordsAsCSV(records: UsageRecord[], filename?: string): void {
  const csv = exportRecordsToCSV(records);
  const defaultFilename = `usage-records-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csv, filename || defaultFilename, 'text/csv');
}

/**
 * Export and download usage records as JSON
 */
export function downloadRecordsAsJSON(records: UsageRecord[], filename?: string): void {
  const json = exportRecordsToJSON(records);
  const defaultFilename = `usage-records-${new Date().toISOString().slice(0, 10)}.json`;
  downloadFile(json, filename || defaultFilename, 'application/json');
}

/**
 * Export and download time series as CSV
 */
export function downloadTimeSeriesAsCSV(data: TimeSeriesDataPoint[], filename?: string): void {
  const csv = exportTimeSeriesToCSV(data);
  const defaultFilename = `usage-timeseries-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadFile(csv, filename || defaultFilename, 'text/csv');
}
