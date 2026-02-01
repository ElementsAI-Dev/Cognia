/**
 * Time Tools Plugin
 *
 * Provides time and timezone utilities for AI agents.
 */

import { definePlugin, Schema, parameters } from '@cognia/plugin-sdk';
import type { PluginContext, PluginHooksAll, PluginToolContext } from '@cognia/plugin-sdk';

// ============================================================================
// Types
// ============================================================================

interface TimeToolsConfig {
  defaultTimezone: string;
  defaultFormat: string;
}

interface TimeNowArgs {
  timezone?: string;
  format?: string;
}

interface TimeConvertArgs {
  timestamp: string;
  fromTimezone: string;
  toTimezone: string;
  format?: string;
}

interface TimeParseArgs {
  dateString: string;
  format?: string;
}

interface TimeDiffArgs {
  startDate: string;
  endDate: string;
  unit?: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months' | 'years';
}

interface TimeFormatArgs {
  timestamp: string;
  format: string;
  timezone?: string;
}

// ============================================================================
// Timezone Database (subset of common timezones with UTC offsets)
// ============================================================================

const TIMEZONE_OFFSETS: Record<string, number> = {
  'UTC': 0,
  'GMT': 0,
  'America/New_York': -5,
  'America/Chicago': -6,
  'America/Denver': -7,
  'America/Los_Angeles': -8,
  'America/Anchorage': -9,
  'Pacific/Honolulu': -10,
  'Europe/London': 0,
  'Europe/Paris': 1,
  'Europe/Berlin': 1,
  'Europe/Moscow': 3,
  'Asia/Dubai': 4,
  'Asia/Kolkata': 5.5,
  'Asia/Bangkok': 7,
  'Asia/Shanghai': 8,
  'Asia/Hong_Kong': 8,
  'Asia/Singapore': 8,
  'Asia/Tokyo': 9,
  'Asia/Seoul': 9,
  'Australia/Sydney': 11,
  'Pacific/Auckland': 13,
};

// ============================================================================
// Helper Functions
// ============================================================================

function getTimezoneOffset(timezone: string): number {
  // Try to get from our database first
  if (timezone in TIMEZONE_OFFSETS) {
    return TIMEZONE_OFFSETS[timezone];
  }

  // Try to parse UTC offset format (e.g., "UTC+8", "GMT-5")
  const offsetMatch = timezone.match(/^(UTC|GMT)([+-])(\d{1,2})(?::(\d{2}))?$/i);
  if (offsetMatch) {
    const sign = offsetMatch[2] === '+' ? 1 : -1;
    const hours = parseInt(offsetMatch[3], 10);
    const minutes = offsetMatch[4] ? parseInt(offsetMatch[4], 10) : 0;
    return sign * (hours + minutes / 60);
  }

  // Default to UTC if unknown
  return 0;
}

function applyTimezoneOffset(date: Date, offsetHours: number): Date {
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utcTime + offsetHours * 3600000);
}

function formatDate(date: Date, format: string): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');

  const replacements: Record<string, string> = {
    'YYYY': date.getFullYear().toString(),
    'YY': date.getFullYear().toString().slice(-2),
    'MM': pad(date.getMonth() + 1),
    'M': (date.getMonth() + 1).toString(),
    'DD': pad(date.getDate()),
    'D': date.getDate().toString(),
    'HH': pad(date.getHours()),
    'H': date.getHours().toString(),
    'hh': pad(date.getHours() % 12 || 12),
    'h': (date.getHours() % 12 || 12).toString(),
    'mm': pad(date.getMinutes()),
    'm': date.getMinutes().toString(),
    'ss': pad(date.getSeconds()),
    's': date.getSeconds().toString(),
    'SSS': pad(date.getMilliseconds(), 3),
    'A': date.getHours() >= 12 ? 'PM' : 'AM',
    'a': date.getHours() >= 12 ? 'pm' : 'am',
  };

  let result = format;
  for (const [token, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(token, 'g'), value);
  }

  return result;
}

function parseDate(dateString: string): Date | null {
  // Try ISO format first
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try common formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,  // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{4})\/(\d{2})\/(\d{2})$/, // YYYY/MM/DD
  ];

  for (const regex of formats) {
    const match = dateString.match(regex);
    if (match) {
      // Handle different format orders
      if (regex === formats[1]) {
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      }
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
  }

  return null;
}

function calculateDiff(start: Date, end: Date, unit: string): number {
  const diffMs = end.getTime() - start.getTime();

  switch (unit) {
    case 'seconds':
      return Math.floor(diffMs / 1000);
    case 'minutes':
      return Math.floor(diffMs / 60000);
    case 'hours':
      return Math.floor(diffMs / 3600000);
    case 'days':
      return Math.floor(diffMs / 86400000);
    case 'weeks':
      return Math.floor(diffMs / 604800000);
    case 'months':
      return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    case 'years':
      return end.getFullYear() - start.getFullYear();
    default:
      return diffMs;
  }
}

// ============================================================================
// Tool Definitions
// ============================================================================

function createTimeNowTool(config: TimeToolsConfig) {
  return {
    name: 'time_now',
    description: 'Get the current date and time in a specified timezone',
    parametersSchema: parameters(
      {
        timezone: Schema.string('Timezone (e.g., "Asia/Shanghai", "America/New_York", "UTC+8")'),
        format: Schema.string('Output format: "ISO", "locale", or custom pattern like "YYYY-MM-DD HH:mm:ss"'),
      },
      []
    ),
    execute: async (args: TimeNowArgs, _context: PluginToolContext) => {
      const timezone = args.timezone || config.defaultTimezone;
      const format = args.format || config.defaultFormat;

      const now = new Date();
      const offset = getTimezoneOffset(timezone);
      const localTime = applyTimezoneOffset(now, offset);

      let formatted: string;
      if (format === 'ISO') {
        formatted = localTime.toISOString();
      } else if (format === 'locale') {
        formatted = localTime.toLocaleString();
      } else {
        formatted = formatDate(localTime, format);
      }

      return {
        success: true,
        timestamp: now.toISOString(),
        timezone,
        offset: `UTC${offset >= 0 ? '+' : ''}${offset}`,
        formatted,
        components: {
          year: localTime.getFullYear(),
          month: localTime.getMonth() + 1,
          day: localTime.getDate(),
          hour: localTime.getHours(),
          minute: localTime.getMinutes(),
          second: localTime.getSeconds(),
          dayOfWeek: localTime.getDay(),
        },
      };
    },
  };
}

function createTimeConvertTool() {
  return {
    name: 'time_convert',
    description: 'Convert a timestamp between timezones',
    parametersSchema: parameters(
      {
        timestamp: Schema.string('The timestamp to convert (ISO format or parseable date string)'),
        fromTimezone: Schema.string('Source timezone'),
        toTimezone: Schema.string('Target timezone'),
        format: Schema.string('Output format (optional)'),
      },
      ['timestamp', 'fromTimezone', 'toTimezone']
    ),
    execute: async (args: TimeConvertArgs, _context: PluginToolContext) => {
      const date = parseDate(args.timestamp);
      if (!date) {
        return {
          success: false,
          error: `Unable to parse timestamp: ${args.timestamp}`,
        };
      }

      const fromOffset = getTimezoneOffset(args.fromTimezone);
      const toOffset = getTimezoneOffset(args.toTimezone);

      // Convert to UTC first, then to target timezone
      const utcTime = date.getTime() - fromOffset * 3600000;
      const targetTime = new Date(utcTime + toOffset * 3600000);

      const format = args.format || 'YYYY-MM-DD HH:mm:ss';
      const formatted = formatDate(targetTime, format);

      return {
        success: true,
        original: {
          timestamp: args.timestamp,
          timezone: args.fromTimezone,
        },
        converted: {
          timestamp: targetTime.toISOString(),
          timezone: args.toTimezone,
          formatted,
        },
        offsetDifference: toOffset - fromOffset,
      };
    },
  };
}

function createTimeParseTool() {
  return {
    name: 'time_parse',
    description: 'Parse a date string into a structured format with components',
    parametersSchema: parameters(
      {
        dateString: Schema.string('The date string to parse'),
        format: Schema.string('Expected format hint (optional, for ambiguous dates)'),
      },
      ['dateString']
    ),
    execute: async (args: TimeParseArgs, _context: PluginToolContext) => {
      const date = parseDate(args.dateString);
      if (!date) {
        return {
          success: false,
          error: `Unable to parse date string: ${args.dateString}`,
          hint: 'Try using ISO format (YYYY-MM-DDTHH:mm:ss) or common formats like YYYY-MM-DD',
        };
      }

      return {
        success: true,
        input: args.dateString,
        iso: date.toISOString(),
        unix: Math.floor(date.getTime() / 1000),
        unixMs: date.getTime(),
        components: {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          hour: date.getHours(),
          minute: date.getMinutes(),
          second: date.getSeconds(),
          millisecond: date.getMilliseconds(),
          dayOfWeek: date.getDay(),
          dayOfYear: Math.floor(
            (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
          ),
          weekOfYear: Math.ceil(
            ((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
          ),
          isLeapYear: (date.getFullYear() % 4 === 0 && date.getFullYear() % 100 !== 0) ||
            date.getFullYear() % 400 === 0,
        },
      };
    },
  };
}

function createTimeDiffTool() {
  return {
    name: 'time_diff',
    description: 'Calculate the difference between two dates/times',
    parametersSchema: parameters(
      {
        startDate: Schema.string('Start date/time'),
        endDate: Schema.string('End date/time'),
        unit: Schema.enum(
          ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months', 'years'],
          'Unit for the difference calculation'
        ),
      },
      ['startDate', 'endDate']
    ),
    execute: async (args: TimeDiffArgs, _context: PluginToolContext) => {
      const start = parseDate(args.startDate);
      const end = parseDate(args.endDate);

      if (!start) {
        return { success: false, error: `Unable to parse start date: ${args.startDate}` };
      }
      if (!end) {
        return { success: false, error: `Unable to parse end date: ${args.endDate}` };
      }

      const unit = args.unit || 'days';
      const diff = calculateDiff(start, end, unit);

      // Also calculate in multiple units for convenience
      const diffMs = end.getTime() - start.getTime();
      const isNegative = diffMs < 0;
      const absDiffMs = Math.abs(diffMs);

      return {
        success: true,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        difference: diff,
        unit,
        isNegative,
        breakdown: {
          totalMilliseconds: diffMs,
          totalSeconds: Math.floor(absDiffMs / 1000),
          totalMinutes: Math.floor(absDiffMs / 60000),
          totalHours: Math.floor(absDiffMs / 3600000),
          totalDays: Math.floor(absDiffMs / 86400000),
          humanReadable: formatDuration(absDiffMs),
        },
      };
    },
  };
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours % 24 > 0) parts.push(`${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`);
  if (minutes % 60 > 0) parts.push(`${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`);
  if (seconds % 60 > 0) parts.push(`${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`);

  return parts.length > 0 ? parts.join(', ') : '0 seconds';
}

function createTimeFormatTool(config: TimeToolsConfig) {
  return {
    name: 'time_format',
    description: 'Format a timestamp according to a pattern',
    parametersSchema: parameters(
      {
        timestamp: Schema.string('The timestamp to format (ISO or parseable date)'),
        format: Schema.string('Format pattern (e.g., "YYYY-MM-DD", "HH:mm:ss", "YYYY/MM/DD HH:mm")'),
        timezone: Schema.string('Timezone to use for formatting'),
      },
      ['timestamp', 'format']
    ),
    execute: async (args: TimeFormatArgs, _context: PluginToolContext) => {
      const date = parseDate(args.timestamp);
      if (!date) {
        return { success: false, error: `Unable to parse timestamp: ${args.timestamp}` };
      }

      const timezone = args.timezone || config.defaultTimezone;
      const offset = getTimezoneOffset(timezone);
      const localDate = applyTimezoneOffset(date, offset);

      return {
        success: true,
        input: args.timestamp,
        format: args.format,
        timezone,
        formatted: formatDate(localDate, args.format),
      };
    },
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

export default definePlugin({
  activate(context: PluginContext): PluginHooksAll | void {
    context.logger.info('Time Tools plugin activated');

    const config: TimeToolsConfig = {
      defaultTimezone: (context.config.defaultTimezone as string) || 'UTC',
      defaultFormat: (context.config.defaultFormat as string) || 'ISO',
    };

    // Register all tools
    const tools = [
      createTimeNowTool(config),
      createTimeConvertTool(),
      createTimeParseTool(),
      createTimeDiffTool(),
      createTimeFormatTool(config),
    ];

    for (const tool of tools) {
      context.agent.registerTool({
        name: tool.name,
        pluginId: context.pluginId,
        definition: {
          name: tool.name,
          description: tool.description,
          parametersSchema: tool.parametersSchema,
        },
        execute: tool.execute,
      });
    }

    context.logger.info(`Registered ${tools.length} time tools`);

    return {
      onEnable: async () => {
        context.logger.info('Time Tools plugin enabled');
      },
      onDisable: async () => {
        context.logger.info('Time Tools plugin disabled');
      },
      onConfigChange: (newConfig: Record<string, unknown>) => {
        config.defaultTimezone = (newConfig.defaultTimezone as string) || 'UTC';
        config.defaultFormat = (newConfig.defaultFormat as string) || 'ISO';
        context.logger.info('Time Tools config updated');
      },
    };
  },
});
