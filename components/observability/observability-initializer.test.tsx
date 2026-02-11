/**
 * ObservabilityInitializer Tests
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ObservabilityInitializer } from './observability-initializer';

// Mock dependencies
const mockInitializeObservability = jest.fn().mockResolvedValue(undefined);
const mockShutdownObservability = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/ai/observability', () => ({
  initializeObservability: (...args: unknown[]) => mockInitializeObservability(...args),
  shutdownObservability: () => mockShutdownObservability(),
}));

const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
jest.mock('@/lib/logger', () => ({
  loggers: {
    ai: {
      info: (...args: unknown[]) => mockLoggerInfo(...args),
      warn: (...args: unknown[]) => mockLoggerWarn(...args),
    },
  },
}));

const mockUseSettingsStore = jest.fn();
jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => mockUseSettingsStore(selector),
}));

describe('ObservabilityInitializer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializeObservability.mockResolvedValue(undefined);
    mockShutdownObservability.mockResolvedValue(undefined);
  });

  it('should render nothing (null)', () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = { observabilitySettings: { enabled: false } };
      return selector(state);
    });

    const { container } = render(<ObservabilityInitializer />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should not initialize when disabled', async () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = { observabilitySettings: { enabled: false } };
      return selector(state);
    });

    render(<ObservabilityInitializer />);

    // Wait a bit to ensure effect has run
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockInitializeObservability).not.toHaveBeenCalled();
  });

  it('should initialize when enabled', async () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        observabilitySettings: {
          enabled: true,
          langfuseEnabled: true,
          langfusePublicKey: 'pk-test',
          langfuseSecretKey: 'sk-test',
          langfuseHost: 'https://langfuse.com',
          openTelemetryEnabled: true,
          openTelemetryEndpoint: 'http://localhost:4318',
          serviceName: 'test-service',
        },
      };
      return selector(state);
    });

    render(<ObservabilityInitializer />);

    await waitFor(() => {
      expect(mockInitializeObservability).toHaveBeenCalledWith({
        langfuse: {
          publicKey: 'pk-test',
          secretKey: 'sk-test',
          host: 'https://langfuse.com',
          enabled: true,
        },
        openTelemetry: {
          serviceName: 'test-service',
          traceEndpoint: 'http://localhost:4318',
          tracingEnabled: true,
        },
      });
    });
  });

  it('should handle missing optional settings', async () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        observabilitySettings: {
          enabled: true,
          langfuseEnabled: false,
          openTelemetryEnabled: false,
        },
      };
      return selector(state);
    });

    render(<ObservabilityInitializer />);

    await waitFor(() => {
      expect(mockInitializeObservability).toHaveBeenCalledWith({
        langfuse: {
          publicKey: undefined,
          secretKey: undefined,
          host: undefined,
          enabled: false,
        },
        openTelemetry: {
          serviceName: 'cognia-ai',
          traceEndpoint: undefined,
          tracingEnabled: false,
        },
      });
    });
  });

  it('should handle initialization error gracefully', async () => {
    mockInitializeObservability.mockRejectedValueOnce(new Error('Init failed'));

    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        observabilitySettings: {
          enabled: true,
          langfuseEnabled: true,
        },
      };
      return selector(state);
    });

    render(<ObservabilityInitializer />);

    await waitFor(() => {
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        '[Observability] Failed to initialize',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });
  });

  it('should log success on initialization', async () => {
    mockUseSettingsStore.mockImplementation((selector) => {
      const state = {
        observabilitySettings: {
          enabled: true,
          langfuseEnabled: true,
        },
      };
      return selector(state);
    });

    render(<ObservabilityInitializer />);

    await waitFor(() => {
      expect(mockLoggerInfo).toHaveBeenCalledWith('[Observability] Initialized successfully');
    });
  });
});
