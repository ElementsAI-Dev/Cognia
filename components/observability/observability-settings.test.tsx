import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ObservabilitySettings } from './observability-settings';

const mockUpdateObservabilitySettings = jest.fn();
const mockUseAgentTrace = jest.fn();

const mockState = {
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
  updateObservabilitySettings: mockUpdateObservabilitySettings,
};

const mockUsageState = {
  records: [] as Array<Record<string, unknown>>,
};

jest.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) => {
    const messages: Record<string, string> = {
      'observability.settings.title': 'Observability',
      'observability.settings.description': 'Track AI operations and observability workflows',
      'observability.settings.stateTitle': 'Status',
      'observability.settings.stateDisabled': 'Capture is off',
      'observability.settings.stateIncomplete': 'Configuration needs attention',
      'observability.settings.stateReady': 'Observability is ready',
      'observability.settings.stateHistoryOnly': 'History is still available',
      'observability.settings.stateDisabledDescription': 'Enable observability capture to start collecting new remote telemetry.',
      'observability.settings.stateIncompleteDescription': 'Some observability integrations still need setup before they can capture data.',
      'observability.settings.stateReadyDescription': 'Your current observability configuration can capture or display supported telemetry.',
      'observability.settings.stateHistoryOnlyDescription': 'Existing history can still be reviewed even though new remote capture is off.',
      'observability.settings.historyHint': 'Usage records or trace history are already stored locally.',
      'observability.settings.agentTrace.title': 'Agent Trace Recording',
      'observability.settings.agentTrace.description': 'Agent trace is managed in its dedicated workspace, but its current state is summarized here.',
      'observability.settings.agentTrace.enabled': 'Agent trace recording is enabled',
      'observability.settings.agentTrace.disabled': 'Agent trace recording is disabled',
      'observability.settings.agentTrace.manage': 'Manage Agent Trace',
      'observability.settings.langfuse.title': 'Langfuse Integration',
      'observability.settings.langfuse.description': 'AI-specific observability for tracing, evaluation, and analytics',
      'observability.settings.langfuse.hostUrl': 'Host URL',
      'observability.settings.langfuse.hostUrlPlaceholder': 'https://cloud.langfuse.com',
      'observability.settings.langfuse.publicKey': 'Public Key',
      'observability.settings.langfuse.publicKeyPlaceholder': 'pk-lf-...',
      'observability.settings.langfuse.secretKey': 'Secret Key',
      'observability.settings.langfuse.secretKeyPlaceholder': 'sk-lf-...',
      'observability.settings.otel.title': 'OpenTelemetry',
      'observability.settings.otel.description': 'Standard distributed tracing for infrastructure observability',
      'observability.settings.otel.endpoint': 'OTLP Endpoint',
      'observability.settings.otel.endpointPlaceholder': 'http://localhost:4318/v1/traces',
      'observability.settings.otel.endpointHint': 'OTLP HTTP endpoint for sending traces',
      'observability.settings.otel.serviceName': 'Service Name',
      'observability.settings.otel.serviceNamePlaceholder': 'cognia-ai',
      'observability.settings.testConnection': 'Test Connection',
      'observability.settings.testingConnection': 'Testing connection...',
      'observability.settings.connectionSuccess': 'Connection successful!',
      'observability.settings.connectionFailed': 'Connection failed',
      'observability.settings.invalidCredentials': 'Invalid API keys',
      'observability.settings.configureKeysFirst': 'Please configure API keys first',
      'observability.settings.getApiKeys': 'Get API Keys',
      'observability.settings.capturePaused': 'Remote capture is paused until global observability is enabled.',
      'observability.settings.incompleteLangfuse': 'Langfuse still needs required credentials before it can be used.',
      'observability.settings.incompleteOtel': 'OpenTelemetry still needs a valid endpoint before it can be used.',
    };

    return messages[namespace ? `${namespace}.${key}` : key] ?? key;
  },
}));

jest.mock('@/stores', () => ({
  useSettingsStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  useUsageStore: (selector: (state: typeof mockUsageState) => unknown) => selector(mockUsageState),
}));

jest.mock('@/hooks/agent-trace', () => ({
  useAgentTrace: (...args: unknown[]) => mockUseAgentTrace(...args),
}));

describe('ObservabilitySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.observabilitySettings = {
      enabled: false,
      langfuseEnabled: false,
      langfusePublicKey: '',
      langfuseSecretKey: '',
      langfuseHost: 'https://cloud.langfuse.com',
      openTelemetryEnabled: false,
      openTelemetryEndpoint: 'http://localhost:4318/v1/traces',
      serviceName: 'cognia-ai',
    };
    mockState.agentTraceSettings = {
      enabled: false,
      maxRecords: 1000,
      autoCleanupDays: 30,
      traceShellCommands: true,
      traceCodeEdits: true,
      traceFailedCalls: false,
    };
    mockUsageState.records = [];
    mockUseAgentTrace.mockReturnValue({
      totalCount: 0,
    });
  });

  it('shows a disabled status summary when capture is off and there is no history', () => {
    render(<ObservabilitySettings />);

    expect(screen.getByText('Capture is off')).toBeInTheDocument();
    expect(
      screen.getByText('Enable observability capture to start collecting new remote telemetry.')
    ).toBeInTheDocument();
  });

  it('shows a history-only summary when capture is off but local history exists', () => {
    mockUsageState.records = [{ id: 'usage-1' }];

    render(<ObservabilitySettings />);

    expect(screen.getByText('History is still available')).toBeInTheDocument();
    expect(
      screen.getByText('Existing history can still be reviewed even though new remote capture is off.')
    ).toBeInTheDocument();
    expect(screen.getByText('Usage records or trace history are already stored locally.')).toBeInTheDocument();
  });

  it('shows explicit incomplete guidance for Langfuse when credentials are missing', () => {
    mockState.observabilitySettings = {
      ...mockState.observabilitySettings,
      enabled: true,
      langfuseEnabled: true,
    };

    render(<ObservabilitySettings />);

    expect(
      screen.getByText('Langfuse still needs required credentials before it can be used.')
    ).toBeInTheDocument();
  });

  it('shows an agent trace summary card and management entry point', () => {
    mockState.agentTraceSettings = {
      ...mockState.agentTraceSettings,
      enabled: true,
    };

    render(<ObservabilitySettings />);

    expect(screen.getByText('Agent Trace Recording')).toBeInTheDocument();
    expect(screen.getByText('Agent trace recording is enabled')).toBeInTheDocument();
    expect(screen.getByText('Manage Agent Trace')).toBeInTheDocument();
  });

  it('updates the global enabled flag through settings actions', () => {
    render(<ObservabilitySettings />);

    fireEvent.click(screen.getAllByRole('switch')[0]);

    expect(mockUpdateObservabilitySettings).toHaveBeenCalledWith({ enabled: true });
  });
});
