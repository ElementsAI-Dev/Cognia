import {
  addTransport,
  getLoggerConfig,
  getTransport,
  getTransports,
  initLogger,
  removeTransport,
  updateLoggerConfig,
} from './core';
import type { UnifiedLoggerConfig } from './types';
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

function persistSettings(
  transports: LoggingTransportSettings,
  retention: LoggingRetentionSettings
): void {
  if (typeof window === 'undefined') {
    return;
  }
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
    addTransport(createRemoteTransport({ endpoint: config.remoteEndpoint }));
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
  const transportSettings = readTransportSettings();
  const retentionSettings = readRetentionSettings();

  if (!hasBootstrapped) {
    initLogger(config);
    hasBootstrapped = true;
  } else if (config) {
    updateLoggerConfig(config);
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
    persistSettings(nextTransports, nextRetention);
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

