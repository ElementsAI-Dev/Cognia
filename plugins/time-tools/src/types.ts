/**
 * Time Tools Plugin Types
 */

export interface TimeToolsConfig {
  defaultTimezone: string;
  defaultFormat: string;
}

export interface TimeComponents {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond?: number;
  dayOfWeek: number;
  dayOfYear?: number;
  weekOfYear?: number;
  isLeapYear?: boolean;
}

export interface TimeNowResult {
  success: boolean;
  timestamp: string;
  timezone: string;
  offset: string;
  formatted: string;
  components: TimeComponents;
}

export interface TimeConvertResult {
  success: boolean;
  original: {
    timestamp: string;
    timezone: string;
  };
  converted: {
    timestamp: string;
    timezone: string;
    formatted: string;
  };
  offsetDifference: number;
}

export interface TimeParseResult {
  success: boolean;
  input: string;
  iso: string;
  unix: number;
  unixMs: number;
  components: TimeComponents;
}

export interface TimeDiffResult {
  success: boolean;
  startDate: string;
  endDate: string;
  difference: number;
  unit: string;
  isNegative: boolean;
  breakdown: {
    totalMilliseconds: number;
    totalSeconds: number;
    totalMinutes: number;
    totalHours: number;
    totalDays: number;
    humanReadable: string;
  };
}

export interface TimeFormatResult {
  success: boolean;
  input: string;
  format: string;
  timezone: string;
  formatted: string;
}

export interface TimeErrorResult {
  success: false;
  error: string;
  hint?: string;
}
