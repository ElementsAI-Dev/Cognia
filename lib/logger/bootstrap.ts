import {
  addTransport,
  emitLoggerDiagnostic,
  getLoggerConfig,
  getTransport,
  getTransports,
  initLogger,
  removeTransport,
  updateLoggerConfig,
} from './core';
import { DEFAULT_UNIFIED_CONFIG } from './types';
import type { LogLevel, UnifiedLoggerConfig } from './types';
import {
  createConsoleTransport,
  createIndexedDBTransport,
  createLangfuseTransport,
  createOtelTransport,
  createRemoteTransport,
  IndexedDBTransport,
} from './transports';

export const LOGGING_TRANSPORTS_STORAGE_KEY = 'cognia-logging-transports';
export const LOGGING_RETENTION_STORAGE_KEY = 'cognia-logging-retention';
export const LOGGING_CONFIG_STORAGE_KEY = 'cognia-logging-config';

export interface LoggingTransportSettings {
  console: boolean;
  indexedDB: boolean;
  remote: boolean;
  langfuse: boolean;
  opentelemetry: boolean;
}

export interface LoggingRetentionSettings {
  maxEntries: number;
  maxAgeDays: number;
}

export interface LoggingBootstrapState {
  config: UnifiedLoggerConfig;
  transports: LoggingTransportSettings;
  retention: LoggingRetentionSettings;
}

const DEFAULT_TRANSPORT_SETTINGS: LoggingTransportSettings = {
  console: true,
  indexedDB: true,
  remote: false,
  langfuse: false,
  opentelemetry: false,
};

const DEFAULT_RETENTION_SETTINGS: LoggingRetentionSettings = {
  maxEntries: 10_000,
  maxAgeDays: 7,
};

const VALID_LOG_LEVELS: ReadonlySet<LogLevel> = new Set([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
]);

let hasBootstrapped = false;
let currentState: LoggingBootstrapState | null = null;

function readStorageJSON<T>(key: string): Partial<T> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
}

function readTransportSettings(): LoggingTransportSettings {
  const raw = readStorageJSON<LoggingTransportSettings>(LOGGING_TRANSPORTS_STORAGE_KEY);
  return { ...DEFAULT_TRANSPORT_SETTINGS, ...(raw || {}) };
}

function readRetentionSettings(): LoggingRetentionSettings {
  const raw = readStorageJSON<LoggingRetentionSettings>(LOGGING_RETENTION_STORAGE_KEY);
  return { ...DEFAULT_RETENTION_SETTINGS, ...(raw || {}) };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  if (value < min || value > max) {
    return fallback;
  }

  return value;
}

function sanitizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const sanitized = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return sanitized.length > 0 ? sanitized : [...fallback];
}

function sanitizeConfig(raw: Partial<UnifiedLoggerConfig> | null): Partial<UnifiedLoggerConfig> {
  if (!raw) {
    return {};
  }

  const sanitized: Partial<UnifiedLoggerConfig> = {};

  if (typeof raw.minLevel === 'string' && VALID_LOG_LEVELS.has(raw.minLevel as LogLevel)) {
    sanitized.minLevel = raw.minLevel as LogLevel;
  }

  if (typeof raw.includeStackTrace === 'boolean') {
    sanitized.includeStackTrace = raw.includeStackTrace;
  }

  if (typeof raw.includeSource === 'boolean') {
    sanitized.includeSource = raw.includeSource;
  }

  sanitized.bufferSize = clampNumber(
    raw.bufferSize,
    1,
    1000,
    DEFAULT_UNIFIED_CONFIG.bufferSize
  );
  sanitized.flushInterval = clampNumber(
    raw.flushInterval,
    250,
    60_000,
    DEFAULT_UNIFIED_CONFIG.flushInterval
  );
  sanitized.remoteQueueMaxEntries = clampNumber(
    raw.remoteQueueMaxEntries,
    100,
    100_000,
    DEFAULT_UNIFIED_CONFIG.remoteQueueMaxEntries
  );
  sanitized.remoteQueueMaxBytes = clampNumber(
    raw.remoteQueueMaxBytes,
    1024 * 1024,
    100 * 1024 * 1024,
    DEFAULT_UNIFIED_CONFIG.remoteQueueMaxBytes
  );
  sanitized.diagnosticRateLimitMs = clampNumber(
    raw.diagnosticRateLimitMs,
    250,
    60_000,
    DEFAULT_UNIFIED_CONFIG.diagnosticRateLimitMs
  );

  if (raw.redaction && typeof raw.redaction === 'object') {
    sanitized.redaction = {
      enabled:
        typeof raw.redaction.enabled === 'boolean'
          ? raw.redaction.enabled
          : DEFAULT_UNIFIED_CONFIG.redaction.enabled,
      replacement:
        typeof raw.redaction.replacement === 'string' && raw.redaction.replacement.trim().length > 0
          ? raw.redaction.replacement
          : DEFAULT_UNIFIED_CONFIG.redaction.replacement,
      redactKeys: sanitizeStringArray(
        raw.redaction.redactKeys,
        DEFAULT_UNIFIED_CONFIG.redaction.redactKeys
      ),
      redactPatterns: sanitizeStringArray(
        raw.redaction.redactPatterns,
        DEFAULT_UNIFIED_CONFIG.redaction.redactPatterns
      ),
      maxDepth: clampNumber(
        raw.redaction.maxDepth,
        1,
        16,
        DEFAULT_UNIFIED_CONFIG.redaction.maxDepth
      ),
    };
  }

  return sanitized;
}

function readConfigSettings(): Partial<UnifiedLoggerConfig> {
  const raw = readStorageJSON<UnifiedLoggerConfig>(LOGGING_CONFIG_STORAGE_KEY);
  return sanitizeConfig(raw);
}

function getPersistedConfig(config: UnifiedLoggerConfig): Partial<UnifiedLoggerConfig> {
  return {
    minLevel: config.minLevel,
    includeStackTrace: config.includeStackTrace,
    includeSource: config.includeSource,
    bufferSize: config.bufferSize,
    flushInterval: config.flushInterval,
    remoteQueueMaxEntries: config.remoteQueueMaxEntries,
    remoteQueueMaxBytes: config.remoteQueueMaxBytes,
    diagnosticRateLimitMs: config.diagnosticRateLimitMs,
    redaction: {
      enabled: config.redaction.enabled,
      replacement: config.redaction.replacement,
      redactKeys: [...config.redaction.redactKeys],
      redactPatterns: [...config.redaction.redactPatterns],
      maxDepth: config.redaction.maxDepth,
    },
  };
}

function persistSettings(
  config: UnifiedLoggerConfig,
  transports: LoggingTransportSettings,
  retention: LoggingRetentionSettings
): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(LOGGING_CONFIG_STORAGE_KEY, JSON.stringify(getPersistedConfig(config)));
  localStorage.setItem(LOGGING_TRANSPORTS_STORAGE_KEY, JSON.stringify(transports));
  localStorage.setItem(LOGGING_RETENTION_STORAGE_KEY, JSON.stringify(retention));
}

function applyTransportSettings(
  transports: LoggingTransportSettings,
  retention: LoggingRetentionSettings,
  config: UnifiedLoggerConfig
): void {
  if (transports.console) {
    addTransport(createConsoleTransport());
  } else {
    removeTransport('console');
  }

  if (transports.indexedDB) {
    const existing = getTransport<IndexedDBTransport>('indexeddb');
    if (existing && typeof existing.updateOptions === 'function') {
      existing.updateOptions({
        maxEntries: retention.maxEntries,
        retentionDays: retention.maxAgeDays,
      });
      addTransport(existing);
    } else {
      removeTransport('indexeddb');
      addTransport(
        createIndexedDBTransport({
          maxEntries: retention.maxEntries,
          retentionDays: retention.maxAgeDays,
        })
      );
    }
  } else {
    removeTransport('indexeddb');
  }

  if (transports.remote && config.remoteEndpoint) {
    addTransport(
      createRemoteTransport({
        endpoint: config.remoteEndpoint,
        maxQueueEntries: config.remoteQueueMaxEntries,
        maxQueueBytes: config.remoteQueueMaxBytes,
        diagnosticRateLimitMs: config.diagnosticRateLimitMs,
        diagnosticEmitter: (event) => {
          emitLoggerDiagnostic({
            code: event.code,
            message: event.message,
            level: event.level,
            data: event.data,
            sourceTransport: event.sourceTransport || 'remote',
            skipTransports: ['remote'],
          });
        },
      })
    );
  } else {
    removeTransport('remote');
  }

  if (transports.langfuse) {
    addTransport(createLangfuseTransport());
  } else {
    removeTransport('langfuse');
  }

  if (transports.opentelemetry) {
    addTransport(createOtelTransport());
  } else {
    removeTransport('opentelemetry');
  }
}

export function bootstrapLogger(config?: Partial<UnifiedLoggerConfig>): LoggingBootstrapState {
  const persistedConfig = readConfigSettings();
  const transportSettings = readTransportSettings();
  const retentionSettings = readRetentionSettings();
  const nextConfig: Partial<UnifiedLoggerConfig> = {
    ...persistedConfig,
    ...config,
    ...((persistedConfig.redaction || config?.redaction)
      ? {
          redaction: {
            ...DEFAULT_UNIFIED_CONFIG.redaction,
            ...(persistedConfig.redaction || {}),
            ...(config?.redaction || {}),
          },
        }
      : {}),
  };

  if (!hasBootstrapped) {
    initLogger(nextConfig);
    hasBootstrapped = true;
  } else if (config) {
    updateLoggerConfig(nextConfig);
  }

  const mergedConfig = getLoggerConfig();
  applyTransportSettings(transportSettings, retentionSettings, mergedConfig);

  currentState = {
    config: mergedConfig,
    transports: transportSettings,
    retention: retentionSettings,
  };

  return currentState;
}

export function applyLoggingSettings(params: {
  config?: Partial<UnifiedLoggerConfig>;
  transports?: Partial<LoggingTransportSettings>;
  retention?: Partial<LoggingRetentionSettings>;
  persist?: boolean;
}): LoggingBootstrapState {
  if (!hasBootstrapped) {
    bootstrapLogger();
  }

  const existing = currentState || {
    config: getLoggerConfig(),
    transports: readTransportSettings(),
    retention: readRetentionSettings(),
  };

  const nextTransports = {
    ...existing.transports,
    ...(params.transports || {}),
  };
  const nextRetention = {
    ...existing.retention,
    ...(params.retention || {}),
  };

  if (params.config) {
    updateLoggerConfig(params.config);
  }

  const nextConfig = getLoggerConfig();
  applyTransportSettings(nextTransports, nextRetention, nextConfig);

  if (params.persist !== false) {
    persistSettings(nextConfig, nextTransports, nextRetention);
  }

  currentState = {
    config: nextConfig,
    transports: nextTransports,
    retention: nextRetention,
  };

  return currentState;
}

export function getLoggingBootstrapState(): LoggingBootstrapState {
  if (!currentState) {
    return bootstrapLogger();
  }
  return currentState;
}

export function getIndexedDBTransport(): IndexedDBTransport | undefined {
  return getTransport<IndexedDBTransport>('indexeddb');
}

export function listRegisteredTransports(): string[] {
  return getTransports().map((transport) => transport.name);
}

