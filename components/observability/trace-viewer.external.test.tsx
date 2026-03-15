import React from 'react';
import { render, screen } from '@testing-library/react';
import { TraceViewer } from './trace-viewer';
import type { TraceData } from '@/types/observability';

const mockUseSettingsStore = jest.fn();

jest.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    const messages: Record<string, string> = {
      'observability.traceViewer.traceId': 'Trace ID:',
      'observability.traceViewer.sessionId': 'Session:',
      'observability.traceViewer.started': 'Started:',
      'observability.traceViewer.duration': 'Duration:',
      'observability.traceViewer.provider': 'Provider:',
      'observability.traceViewer.model': 'Model:',
      'observability.traceViewer.spanTree': 'Span Tree',
      'observability.traceViewer.noSpans': 'No spans recorded',
      'observability.traceViewer.metadata': 'Metadata',
      'observability.traceViewer.openInLangfuse': 'Open in Langfuse',
      'observability.traceViewer.input': 'Input',
      'observability.traceViewer.output': 'Output',
      'observability.traceViewer.externalUnavailable': 'Langfuse link unavailable',
      'observability.traceViewer.externalUnavailableDescription':
        'Configure Langfuse in observability settings to open this trace externally.',
      'observability.traceViewer.tokenUsage.prompt': 'Prompt:',
      'observability.traceViewer.tokenUsage.completion': 'Completion:',
      'observability.traceViewer.tokenUsage.total': 'Total:',
      'observability.traceViewer.tokenUsage.cost': 'Cost:',
    };

    return messages[namespace ? `${namespace}.${key}` : key] ?? key;
  },
}));

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: unknown) => unknown) => mockUseSettingsStore(selector),
}));

const trace: TraceData = {
  id: 'trace-123',
  name: 'Trace test',
  startTime: new Date('2024-01-01T10:00:00Z'),
  status: 'success',
  spans: [],
};

describe('TraceViewer external observability affordance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows an explicit unavailable explanation when Langfuse is disabled', () => {
    mockUseSettingsStore.mockImplementation((selector) =>
      selector({
        observabilitySettings: {
          enabled: false,
          langfuseEnabled: false,
          langfusePublicKey: '',
          langfuseSecretKey: '',
          langfuseHost: 'https://cloud.langfuse.com',
          openTelemetryEnabled: false,
          openTelemetryEndpoint: 'http://localhost:4318/v1/traces',
          serviceName: 'cognia-ai',
        },
        agentTraceSettings: {
          enabled: false,
          maxRecords: 1000,
          autoCleanupDays: 30,
          traceShellCommands: true,
          traceCodeEdits: true,
          traceFailedCalls: false,
        },
      })
    );

    render(<TraceViewer trace={trace} />);

    expect(screen.getByText('Langfuse link unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('Configure Langfuse in observability settings to open this trace externally.')
    ).toBeInTheDocument();
  });
});
