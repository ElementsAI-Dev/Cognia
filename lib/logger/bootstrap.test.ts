/**
 * @jest-environment jsdom
 */

import type { UnifiedLoggerConfig } from './types';

const defaultMockConfig: UnifiedLoggerConfig = {
  minLevel: 'info',
  includeStackTrace: true,
  includeSource: false,
  bufferSize: 100,
  flushInterval: 1000,
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  maxStorageEntries: 5000,
  redaction: {
    enabled: true,
    replacement: '[REDACTED]',
    redactKeys: ['token'],
    redactPatterns: ['Bearer\\s+.+'],
    maxDepth: 8,
  },
  remoteQueueMaxEntries: 5000,
  remoteQueueMaxBytes: 10 * 1024 * 1024,
  diagnosticRateLimitMs: 2000,
};

let mockConfig = { ...defaultMockConfig };

const mockInitLogger = jest.fn((config?: Partial<typeof defaultMockConfig>) => {
  mockConfig = {
    ...defaultMockConfig,
    ...config,
    redaction: {
      ...defaultMockConfig.redaction,
      ...(config?.redaction || {}),
    },
  };
});
const mockUpdateLoggerConfig = jest.fn((config?: Partial<typeof defaultMockConfig>) => {
  mockConfig = {
    ...mockConfig,
    ...config,
    redaction: {
      ...mockConfig.redaction,
      ...(config?.redaction || {}),
    },
  };
});
const mockGetLoggerConfig = jest.fn(() => mockConfig);
const mockAddTransport = jest.fn();
const mockRemoveTransport = jest.fn();
const mockGetTransport = jest.fn();
const mockGetTransports = jest.fn(() => []);
const mockEmitLoggerDiagnostic = jest.fn();

jest.mock('./core', () => ({
  addTransport: mockAddTransport,
  emitLoggerDiagnostic: mockEmitLoggerDiagnostic,
  getLoggerConfig: mockGetLoggerConfig,
  getTransport: mockGetTransport,
  getTransports: mockGetTransports,
  initLogger: mockInitLogger,
  removeTransport: mockRemoveTransport,
  updateLoggerConfig: mockUpdateLoggerConfig,
}));

jest.mock('./transports', () => ({
  createConsoleTransport: jest.fn(() => ({ name: 'console', log: jest.fn() })),
  createIndexedDBTransport: jest.fn(() => ({ name: 'indexeddb', log: jest.fn(), updateOptions: jest.fn() })),
  createLangfuseTransport: jest.fn(() => ({ name: 'langfuse', log: jest.fn() })),
  createOtelTransport: jest.fn(() => ({ name: 'opentelemetry', log: jest.fn() })),
  createRemoteTransport: jest.fn(() => ({ name: 'remote', log: jest.fn() })),
  IndexedDBTransport: jest.fn(),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('logger bootstrap advanced config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    mockConfig = { ...defaultMockConfig };
  });

  async function loadBootstrapModule() {
    let bootstrapModule: typeof import('./bootstrap');
    await jest.isolateModulesAsync(async () => {
      bootstrapModule = await import('./bootstrap');
    });
    return bootstrapModule!;
  }

  it('persists advanced logging config when settings are applied', async () => {
    const bootstrap = await loadBootstrapModule();

    bootstrap.applyLoggingSettings({
      config: {
        remoteQueueMaxEntries: 9000,
        remoteQueueMaxBytes: 5 * 1024 * 1024,
        diagnosticRateLimitMs: 4500,
        redaction: {
          enabled: false,
          replacement: '[REDACTED]',
          redactKeys: ['token'],
          redactPatterns: ['Bearer\\s+.+'],
          maxDepth: 4,
        },
      },
      persist: true,
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      bootstrap.LOGGING_CONFIG_STORAGE_KEY,
      expect.any(String)
    );
  });

  it('falls back to safe defaults for invalid persisted advanced config', async () => {
    localStorageMock.setItem(
      'cognia-logging-config',
      JSON.stringify({
        remoteQueueMaxEntries: -10,
        remoteQueueMaxBytes: 64,
        diagnosticRateLimitMs: 0,
        redaction: {
          enabled: 'invalid',
          maxDepth: -1,
        },
      })
    );

    const bootstrap = await loadBootstrapModule();
    const state = bootstrap.bootstrapLogger();

    expect(state.config.remoteQueueMaxEntries).toBe(defaultMockConfig.remoteQueueMaxEntries);
    expect(state.config.remoteQueueMaxBytes).toBe(defaultMockConfig.remoteQueueMaxBytes);
    expect(state.config.diagnosticRateLimitMs).toBe(defaultMockConfig.diagnosticRateLimitMs);
    expect(state.config.redaction.enabled).toBe(defaultMockConfig.redaction.enabled);
    expect(state.config.redaction.maxDepth).toBe(defaultMockConfig.redaction.maxDepth);
  });
});
