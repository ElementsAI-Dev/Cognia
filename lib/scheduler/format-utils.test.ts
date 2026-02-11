/**
 * Format Utilities Tests
 */

import { formatDuration, formatRelativeTime, formatNextRun } from './format-utils';

describe('formatDuration', () => {
  it('should return dash for undefined', () => {
    expect(formatDuration(undefined)).toBe('-');
  });

  it('should return dash for zero', () => {
    expect(formatDuration(0)).toBe('-');
  });

  it('should format milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('should format seconds', () => {
    expect(formatDuration(5000)).toBe('5.0s');
    expect(formatDuration(1500)).toBe('1.5s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(300000)).toBe('5m 0s');
  });

  it('should format hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
    expect(formatDuration(5400000)).toBe('1h 30m');
  });
});

describe('formatRelativeTime', () => {
  it('should return dash for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('-');
  });

  it('should return Overdue for past dates', () => {
    const past = new Date(Date.now() - 60000);
    expect(formatRelativeTime(past)).toBe('Overdue');
  });

  it('should return custom overdue label', () => {
    const past = new Date(Date.now() - 60000);
    expect(formatRelativeTime(past, { overdue: 'Past' })).toBe('Past');
  });

  it('should return < 1 min for near future', () => {
    const soon = new Date(Date.now() + 30000);
    expect(formatRelativeTime(soon)).toBe('< 1 min');
  });

  it('should return minutes', () => {
    const inMinutes = new Date(Date.now() + 5 * 60000);
    expect(formatRelativeTime(inMinutes)).toBe('5m');
  });

  it('should return hours', () => {
    const inHours = new Date(Date.now() + 3 * 3600000);
    expect(formatRelativeTime(inHours)).toBe('3h');
  });

  it('should return days', () => {
    const inDays = new Date(Date.now() + 2 * 86400000 + 60000);
    expect(formatRelativeTime(inDays)).toBe('2d');
  });
});

describe('formatNextRun', () => {
  it('should return No schedule for undefined', () => {
    expect(formatNextRun(undefined)).toBe('No schedule');
  });

  it('should use custom noSchedule label', () => {
    expect(formatNextRun(undefined, { noSchedule: 'N/A' })).toBe('N/A');
  });

  it('should return formatted date for far future', () => {
    const farFuture = new Date(Date.now() + 5 * 86400000);
    const result = formatNextRun(farFuture);
    // Should contain month abbreviation
    expect(result).toBeTruthy();
    expect(result).not.toBe('No schedule');
  });
});
